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
import { RouteComponentProps } from 'react-router';
import { UNIQUENESS_ENFORCING_TYPES } from 'x-pack/plugins/beats_management/common/constants';
import { BeatTag, CMPopulatedBeat, ConfigurationBlock } from '../../../common/domain_types';
import { BeatsTagAssignment } from '../../../server/lib/adapters/beats/adapter_types';
import { AppURLState } from '../../app';
import { BeatsTableType, Table } from '../../components/table';
import { beatsListAssignmentOptions } from '../../components/table/assignment_schema';
import { AssignmentActionType } from '../../components/table/table';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { URLStateProps } from '../../containers/with_url_state';
import { FrontendLibs } from '../../lib/lib';
import { EnrollBeatPage } from './enroll_fragment';

interface BeatsPageProps extends URLStateProps<AppURLState> {
  libs: FrontendLibs;
  location: any;
  beats: CMPopulatedBeat[];
  loadBeats: () => any;
}

interface BeatsPageState {
  notifications: any[];
  tableRef: any;
  tags: any[] | null;
}

interface ActionAreaProps extends URLStateProps<AppURLState>, RouteComponentProps<any> {
  libs: FrontendLibs;
}

export class BeatsPage extends React.PureComponent<BeatsPageProps, BeatsPageState> {
  public static ActionArea = (props: ActionAreaProps) => (
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
          props.goTo(`/overview/beats/enroll`);
        }}
      >
        Enroll Beats
      </EuiButton>

      {props.location.pathname === '/overview/beats/enroll' && (
        <EuiOverlayMask>
          <EuiModal
            onClose={() => {
              props.goTo(`/overview/beats`);
            }}
            style={{ width: '640px' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>Enroll a new Beat</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EnrollBeatPage {...props} />
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </React.Fragment>
  );
  constructor(props: BeatsPageProps) {
    super(props);

    this.state = {
      notifications: [],
      tableRef: React.createRef(),
      tags: null,
    };
  }

  public componentDidUpdate(prevProps: any) {
    if (this.props.location !== prevProps.location) {
      this.props.loadBeats();
    }
  }
  public render() {
    return (
      <div>
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
                items: this.filterSelectedBeatTags(),
                schema: beatsListAssignmentOptions,
                type: 'assignment',
                actionHandler: this.handleBeatsActions,
              }}
              items={sortBy(this.props.beats, 'id') || []}
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
      </div>
    );
  }

  private handleBeatsActions = (action: AssignmentActionType, payload: any) => {
    switch (action) {
      case AssignmentActionType.Assign:
        this.handleBeatTagAssignment(payload);
        break;
      case AssignmentActionType.Edit:
        // TODO: navigate to edit page
        break;
      case AssignmentActionType.Delete:
        this.deleteSelected();
        break;
      case AssignmentActionType.Reload:
        this.loadTags();
        break;
    }

    this.props.loadBeats();
  };

  private handleBeatTagAssignment = async (tagId: string) => {
    const selected = this.getSelectedBeats();
    if (selected.some(beat => beat.full_tags.some(({ id }) => id === tagId))) {
      await this.removeTagsFromBeats(selected, tagId);
    } else {
      await this.assignTagsToBeats(selected, tagId);
    }
  };

  private deleteSelected = async () => {
    const selected = this.getSelectedBeats();
    for (const beat of selected) {
      await this.props.libs.beats.update(beat.id, { active: false });
    }

    this.notifyBeatDisenrolled(selected);

    // because the compile code above has a very minor race condition, we wait,
    // the max race condition time is really 10ms but doing 100 to be safe
    setTimeout(async () => {
      await this.props.loadBeats();
    }, 100);
  };

  private loadTags = async () => {
    const tags = await this.props.libs.tags.getAll();
    this.setState({
      tags,
    });
  };

  private createBeatTagAssignments = (
    beats: CMPopulatedBeat[],
    tagId: string
  ): BeatsTagAssignment[] => beats.map(({ id }) => ({ beatId: id, tag: tagId }));

  private removeTagsFromBeats = async (beats: CMPopulatedBeat[], tagId: string) => {
    if (beats.length) {
      const assignments = this.createBeatTagAssignments(beats, tagId);
      await this.props.libs.beats.removeTagsFromBeats(assignments);
      await this.refreshData();
      this.notifyUpdatedTagAssociation('remove', assignments, tagId);
    }
  };

  private assignTagsToBeats = async (beats: CMPopulatedBeat[], tagId: string) => {
    if (beats.length) {
      const assignments = this.createBeatTagAssignments(beats, tagId);
      await this.props.libs.beats.assignTagsToBeats(assignments);
      await this.refreshData();
      this.notifyUpdatedTagAssociation('add', assignments, tagId);
    }
  };

  private notifyBeatDisenrolled = async (beats: CMPopulatedBeat[]) => {
    let title;
    let text;
    if (beats.length === 1) {
      title = `"${beats[0].name || beats[0].id}" disenrolled`;
      text = `Beat with ID "${beats[0].id}" was disenrolled.`;
    } else {
      title = `${beats.length} beats disenrolled`;
    }

    this.setState({
      notifications: this.state.notifications.concat({
        color: 'warning',
        id: `disenroll_${new Date()}`,
        title,
        text,
      }),
    });
  };

  private notifyUpdatedTagAssociation = (
    action: 'add' | 'remove',
    assignments: BeatsTagAssignment[],
    tag: string
  ) => {
    const actionName = action === 'remove' ? 'Removed' : 'Added';
    const preposition = action === 'remove' ? 'from' : 'to';
    const beatMessage =
      assignments.length && assignments.length === 1
        ? `beat "${this.getNameForBeatId(assignments[0].beatId)}"`
        : `${assignments.length} beats`;
    this.setState({
      notifications: this.state.notifications.concat({
        color: 'success',
        id: `tag-${moment.now()}`,
        text: <p>{`${actionName} tag "${tag}" ${preposition} ${beatMessage}.`}</p>,
        title: `Tag ${actionName}`,
      }),
    });
  };

  private getNameForBeatId = (beatId: string) => {
    const beat = this.props.beats.find(b => b.id === beatId);
    if (beat) {
      return beat.name;
    }
    return null;
  };

  private refreshData = async () => {
    await this.loadTags();
    await this.props.loadBeats();
    this.state.tableRef.current.setSelection(this.getSelectedBeats());
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

  private filterSelectedBeatTags = () => {
    if (!this.state.tags) {
      return [];
    }
    return this.selectedBeatConfigsRequireUniqueness()
      ? this.state.tags.map(this.disableTagForUniquenessEnforcement)
      : this.state.tags;
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
