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
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { flatten } from 'lodash';
import moment from 'moment';
import React from 'react';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { EnrollBeat } from '../../components/enroll_beats';
import { Breadcrumb } from '../../components/navigation/breadcrumb';
import { BeatsTableType, Table } from '../../components/table';
import { beatsListActions } from '../../components/table/action_schema';
import { AssignmentActionType } from '../../components/table/table';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { AppPageProps } from '../../frontend_types';

interface PageProps extends AppPageProps {
  renderAction: (area: () => JSX.Element) => void;
  intl: InjectedIntl;
}

interface PageState {
  notifications: any[];
  tags: BeatTag[] | null;
  beats: {
    list: CMBeat[];
    page: number;
    total: number;
  };
  assignmentOptions: BeatTag[] | null;
}

class BeatsPageComponent extends React.PureComponent<PageProps, PageState> {
  private tableRef: React.RefObject<any> = React.createRef();
  constructor(props: PageProps) {
    super(props);

    this.state = {
      notifications: [],
      tags: null,
      beats: {
        list: [],
        page: 0,
        total: 0,
      },
      assignmentOptions: null,
    };

    props.renderAction(this.renderActionArea);
  }

  public componentDidMount() {
    this.updateBeatsData(this.props.urlState.beatsKBar);
  }

  public async updateBeatsData(beatsKBar?: string) {
    const beats = await this.props.libs.beats.getAll(
      beatsKBar,
      this.props.urlState.beatsPage || 0,
      this.props.urlState.beatsSize || 25
    );

    if (beats.total === 0) {
      return this.props.goTo(`/walkthrough/initial`);
    }

    const tags = await this.props.libs.tags.getTagsWithIds(
      flatten(beats.list.map(beat => beat.tags))
    );

    this.setState({
      tags,
      beats: {
        list: beats.list.map(beat => ({
          ...beat,
          tags: (this.state.tags || []).filter(tag => beat.tags.includes(tag.id)),
        })) as any[],
        total: beats.total,
        page: beats.page,
      },
    });
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
        <FormattedMessage
          id="xpack.beatsManagement.beats.installBeatsLearningButtonLabel"
          defaultMessage="Learn how to install beats"
        />
      </EuiButtonEmpty>
      <EuiButton
        size="s"
        color="primary"
        onClick={async () => {
          this.props.goTo(`/overview/enrolled_beats/enroll`);
        }}
      >
        <FormattedMessage
          id="xpack.beatsManagement.beats.enrollBeatsButtonLabel"
          defaultMessage="Enroll Beats"
        />
      </EuiButton>

      {this.props.location.pathname === '/overview/enrolled_beats/enroll' && (
        <EuiOverlayMask>
          <EuiModal
            onClose={() => {
              this.props.setUrlState({
                enrollmentToken: '',
              });
              this.props.goTo(`/overview/enrolled_beats`);
            }}
            style={{ width: '640px' }}
          >
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="xpack.beatsManagement.beats.enrollNewBeatsTitle"
                  defaultMessage="Enroll a new Beat"
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EnrollBeat
                frameworkBasePath={this.props.libs.framework.info.basePath}
                enrollmentToken={this.props.urlState.enrollmentToken}
                getBeatWithToken={this.props.libs.beats.getBeatWithToken}
                createEnrollmentToken={async () => {
                  const enrollmentTokens = await this.props.libs.tokens.createEnrollmentTokens();
                  this.props.setUrlState({
                    enrollmentToken: enrollmentTokens[0],
                  });
                }}
                onBeatEnrolled={() => {
                  this.props.setUrlState({
                    enrollmentToken: '',
                  });
                }}
              />
              {!this.props.urlState.enrollmentToken && (
                <React.Fragment>
                  <EuiButton
                    size="s"
                    color="primary"
                    style={{ marginLeft: 10 }}
                    onClick={async () => {
                      this.props.goTo('/overview/enrolled_beats');
                    }}
                  >
                    Done
                  </EuiButton>
                </React.Fragment>
              )}
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </React.Fragment>
  );

  public render() {
    return (
      <React.Fragment>
        <Breadcrumb
          title={i18n.translate('xpack.beatsManagement.breadcrumb.enrolledBeats', {
            defaultMessage: 'Enrolled Beats',
          })}
          path={`/overview/enrolled_beats`}
        />
        <WithKueryAutocompletion libs={this.props.libs} fieldPrefix="beat">
          {autocompleteProps => (
            <Table
              kueryBarProps={{
                ...autocompleteProps,
                filterQueryDraft: 'false', // todo
                isValid: this.props.libs.elasticsearch.isKueryValid(
                  this.props.urlState.beatsKBar || ''
                ),
                onChange: (value: any) => {
                  this.props.setUrlState({ beatsKBar: value });

                  this.updateBeatsData(value);
                },
                onSubmit: () => null, // todo
                value: this.props.urlState.beatsKBar || '',
              }}
              actions={beatsListActions}
              actionData={{
                tags: this.state.assignmentOptions,
              }}
              actionHandler={async (action: AssignmentActionType, payload: any) => {
                const selectedBeats = this.getSelectedBeats();
                if (!selectedBeats.length) {
                  return false;
                }

                switch (action) {
                  case AssignmentActionType.Assign:
                    const assignments = this.props.libs.beats.createBeatTagAssignments(
                      selectedBeats,
                      payload
                    );

                    let status;
                    let assignType: 'added' | 'removed';
                    if (
                      selectedBeats.some(
                        beat => beat.tags !== undefined && beat.tags.some(id => id === payload)
                      )
                    ) {
                      status = await this.props.libs.beats.assignTagsToBeats(assignments);
                      assignType = 'removed';
                    } else {
                      status = await this.props.libs.beats.assignTagsToBeats(assignments);
                      assignType = 'added';
                    }

                    if (status && !status.find(s => !s.success)) {
                      await this.updateBeatsData();
                      this.notifyUpdatedTagAssociation(
                        assignType,
                        this.getSelectedBeats(),
                        payload
                      );
                    } else if (status && status.find(s => !s.success)) {
                      // @ts-ignore
                      alert(status.find(s => !s.success).error.message);
                    }

                    break;
                  case AssignmentActionType.Delete:
                    for (const beat of selectedBeats) {
                      await this.props.libs.beats.update(beat.id, { active: false });
                    }

                    // because the compile code above has a very minor race condition, we wait,
                    // the max race condition time is really 10ms but doing 100 to be safe
                    setTimeout(async () => {
                      await this.updateBeatsData();
                    }, 100);

                    this.notifyBeatDisenrolled(this.getSelectedBeats());
                    break;
                  case AssignmentActionType.Reload:
                    const assignmentOptions = await this.props.libs.tags.getassignableTagsForBeats(
                      this.getSelectedBeats()
                    );
                    this.setState({ assignmentOptions });
                    break;
                }
              }}
              items={this.state.beats}
              ref={this.tableRef}
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
    );
  }

  private notifyBeatDisenrolled = async (beats: CMBeat[]) => {
    const { intl } = this.props;
    let title;
    let text;
    if (beats.length === 1) {
      title = intl.formatMessage(
        {
          id: 'xpack.beatsManagement.beats.beatDisenrolledNotificationTitle',
          defaultMessage: '{firstBeatNameOrId} disenrolled',
        },
        {
          firstBeatNameOrId: `"${beats[0].name || beats[0].id}"`,
        }
      );
      text = intl.formatMessage(
        {
          id: 'xpack.beatsManagement.beats.beatDisenrolledNotificationDescription',
          defaultMessage: 'Beat with ID {firstBeatId} was disenrolled.',
        },
        {
          firstBeatId: `"${beats[0].id}"`,
        }
      );
    } else {
      title = intl.formatMessage(
        {
          id: 'xpack.beatsManagement.beats.disenrolledBeatsNotificationTitle',
          defaultMessage: '{beatsLength} beats disenrolled',
        },
        {
          beatsLength: beats.length,
        }
      );
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
    action: 'added' | 'removed',
    beats: CMBeat[],
    tag: string
  ) => {
    const { intl } = this.props;
    const notificationMessage =
      action === 'removed'
        ? intl.formatMessage(
            {
              id: 'xpack.beatsManagement.beats.removedNotificationDescription',
              defaultMessage:
                'Removed tag {tag} from {assignmentsLength, plural, one {beat {beatName}} other {# beats}}.',
            },
            {
              tag: `"${tag}"`,
              assignmentsLength: beats.length,
              beatName: `"${beats[0].name || beats[0].id}"`,
            }
          )
        : intl.formatMessage(
            {
              id: 'xpack.beatsManagement.beats.addedNotificationDescription',
              defaultMessage:
                'Added tag {tag} to {assignmentsLength, plural, one {beat {beatName}} other {# beats}}.',
            },
            {
              tag: `"${tag}"`,
              assignmentsLength: beats.length,
              beatName: `"${beats[0].name || beats[0].id}"`,
            }
          );
    const notificationTitle =
      action === 'removed'
        ? intl.formatMessage(
            {
              id: 'xpack.beatsManagement.beats.removedNotificationTitle',
              defaultMessage: '{assignmentsLength, plural, one {Tag} other {Tags}} removed',
            },
            {
              assignmentsLength: beats.length,
            }
          )
        : intl.formatMessage(
            {
              id: 'xpack.beatsManagement.beats.addedNotificationTitle',
              defaultMessage: '{assignmentsLength, plural, one {Tag} other {Tags}} added',
            },
            {
              assignmentsLength: beats.length,
            }
          );

    this.setState({
      notifications: this.state.notifications.concat({
        color: 'success',
        id: `tag-${moment.now()}`,
        text: <p>{notificationMessage}</p>,
        title: notificationTitle,
      }),
    });
  };

  private getSelectedBeats = (): CMBeat[] => {
    if (!this.tableRef.current) {
      return [];
    }
    const selectedIds = this.tableRef.current.state.selection.map((beat: any) => beat.id);
    const beats: CMBeat[] = [];
    selectedIds.forEach((id: any) => {
      const beat = this.state.beats.list.find(b => b.id === id);
      if (beat) {
        beats.push(beat);
      }
    });
    return beats;
  };
}

export const BeatsPage = injectI18n(BeatsPageComponent);
