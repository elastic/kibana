/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiGlobalToastList,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import { flatten, intersection, sortBy } from 'lodash';
import moment from 'moment';
import React from 'react';
import { Subscribe } from 'unstated';
import { UNIQUENESS_ENFORCING_TYPES } from 'x-pack/plugins/beats_management/common/constants';
import { BeatTag, CMPopulatedBeat, ConfigurationBlock } from '../../../common/domain_types';
import { EnrollBeat } from '../../components/enroll_beats';
import { BeatsTableType, Table } from '../../components/table';
import { beatsListAssignmentOptions } from '../../components/table/assignment_schema';
import { AssignmentActionType } from '../../components/table/table';
import { BeatsContainer } from '../../containers/beats';
import { TagsContainer } from '../../containers/tags';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { AppPageProps } from '../../frontend_types';

interface PageProps extends AppPageProps {
  beats: CMPopulatedBeat[];
  loadBeats: () => any;
  renderAction: (area: JSX.Element) => void;
}

interface PageState {
  notifications: any[];
  tableRef: any;
  tags: BeatTag[] | null;
}

export class BeatsPage extends React.PureComponent<PageProps, PageState> {
  constructor(props: PageProps) {
    super(props);

    this.state = {
      notifications: [],
      tableRef: React.createRef(),
      tags: null,
    };

    props.renderAction(this.renderActionArea());
  }

  public renderActionArea = () => (
    <React.Fragment>
      <EuiButtonEmpty
        onClick={() => {
          // random, but specific number ensures new tab does not overwrite another _newtab in chrome
          // and at the same time not truly random so that many clicks of the link open many tabs at this same URL
          window.open(
            'https://www.elastic.co/guide/en/beats/libbeat/current/getting-started.html',
            '_newtab35628937456'
          );
        }}
      >
        Learn how to install beats
      </EuiButtonEmpty>
      <EuiButton
        size="s"
        color="primary"
        onClick={async () => {
          this.props.goTo(`/overview/beats/enroll`);
        }}
      >
        Enroll Beats
      </EuiButton>

      {this.props.location.pathname === '/overview/beats/enroll' && (
        <EuiOverlayMask>
          <EuiModal
            onClose={() => {
              this.props.goTo(`/overview/beats`);
            }}
            style={{ width: '640px' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>Enroll a new Beat</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EnrollBeat {...this.props} />
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </React.Fragment>
  );

  public componentDidUpdate(prevProps: any) {
    if (this.props.location !== prevProps.location) {
      this.props.loadBeats();
    }
  }
  public render() {
    return (
      <Subscribe to={[BeatsContainer, TagsContainer]}>
        {(beats: BeatsContainer, tags: TagsContainer) => (
          <React.Fragment>
            <WithKueryAutocompletion libs={this.props.libs} fieldPrefix="beat">
              {autocompleteProps => (
                <Table
                  kueryBarProps={{
                    ...autocompleteProps,
                    filterQueryDraft: 'false', // todo
                    isValid: this.props.libs.elasticsearch.isKueryValid(
                      this.props.urlState.beatsKBar || ''
                    ), // todo check if query converts to es query correctly
                    onChange: (value: any) => this.props.setUrlState({ beatsKBar: value }), // todo
                    onSubmit: () => null, // todo
                    value: this.props.urlState.beatsKBar || '',
                  }}
                  assignmentOptions={{
                    items: this.filterTags(tags.state.list),
                    schema: beatsListAssignmentOptions,
                    type: 'assignment',
                    actionHandler: async (action: AssignmentActionType, payload: any) => {
                      switch (action) {
                        case AssignmentActionType.Assign:
                          const status = await beats.toggleTagAssignment(
                            payload,
                            this.getSelectedBeats()
                          );
                          this.notifyUpdatedTagAssociation(
                            status,
                            this.getSelectedBeats(),
                            payload
                          );
                          break;
                        case AssignmentActionType.Delete:
                          beats.deactivate(this.getSelectedBeats());
                          this.notifyBeatDisenrolled(this.getSelectedBeats());
                          break;
                        case AssignmentActionType.Reload:
                          tags.reload();
                          break;
                      }
                    },
                  }}
                  items={sortBy(beats.state.list, 'id') || []}
                  ref={this.state.tableRef}
                  type={BeatsTableType}
                />
              )}
            </WithKueryAutocompletion>
            <EuiGlobalToastList
              toasts={this.state.notifications}
              dismissToast={() => this.setState({ notifications: [] })}
              toastLifeTimeMs={5000}
            />
          </React.Fragment>
        )}
      </Subscribe>
    );
  }

  private notifyBeatDisenrolled = async (beats: CMPopulatedBeat[]) => {
    this.setState({
      notifications: this.state.notifications.concat({
        color: 'warning',
        id: `disenroll_${new Date()}`,
        title: `${beats.length} Beat${beats.length === 1 ? null : 's'} disenrolled`,
      }),
    });
  };

  private notifyUpdatedTagAssociation = (
    action: 'added' | 'removed',
    beats: CMPopulatedBeat[],
    tag: string
  ) => {
    const actionName = action === 'removed' ? 'Removed' : 'Added';
    const preposition = action === 'removed' ? 'from' : 'to';
    const beatMessage = `${beats.length} Beat${beats.length === 1 ? null : 's'}`;
    this.setState({
      notifications: this.state.notifications.concat({
        color: 'success',
        id: `tag-${moment.now()}`,
        text: <p>{`${actionName} tag "${tag}" ${preposition} ${beatMessage}.`}</p>,
        title: `Tag ${actionName}`,
      }),
    });
  };

  private getSelectedBeats = (): CMPopulatedBeat[] => {
    const selectedIds = this.state.tableRef.current.state.selection.map((beat: any) => beat.id);
    const beats: CMPopulatedBeat[] = [];
    selectedIds.forEach((id: any) => {
      const beat: CMPopulatedBeat | undefined = this.props.beats.find(b => b.id === id);
      if (beat) {
        beats.push(beat);
      }
    });
    return beats;
  };

  private filterTags = (tags: BeatTag[]) => {
    return this.selectedBeatConfigsRequireUniqueness()
      ? tags.map(this.disableTagForUniquenessEnforcement)
      : tags;
  };

  private configBlocksRequireUniqueness = (configurationBlocks: ConfigurationBlock[]) =>
    intersection(UNIQUENESS_ENFORCING_TYPES, configurationBlocks.map(block => block.type))
      .length !== 0;

  private disableTagForUniquenessEnforcement = (tag: BeatTag) =>
    this.configBlocksRequireUniqueness(tag.configuration_blocks) &&
    // if > 0 beats are associated with the tag, it will result in disassociation, so do not disable it
    !this.getSelectedBeats().some(beat => beat.full_tags.some(({ id }) => id === tag.id))
      ? { ...tag, disabled: true }
      : tag;

  private selectedBeatConfigsRequireUniqueness = () =>
    // union beat tags
    flatten(this.getSelectedBeats().map(({ full_tags }) => full_tags))
      // map tag list to bool
      .map(({ configuration_blocks }) => this.configBlocksRequireUniqueness(configuration_blocks))
      // reduce to result
      .reduce((acc, cur) => acc || cur, false);
}
