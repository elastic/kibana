/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList } from '@elastic/eui';
import { get } from 'lodash';
import moment from 'moment';
import React from 'react';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { BeatDetailTagsTable, Table } from '../../components/table';
import { FrontendLibs } from '../../lib/lib';

interface BeatTagsPageProps {
  beatId: string;
  libs: FrontendLibs;
  refreshBeat(): void;
}

interface BeatTagsPageState {
  beat: CMPopulatedBeat | null;
  notifications: any[];
}

export class BeatTagsPage extends React.PureComponent<BeatTagsPageProps, BeatTagsPageState> {
  private tableRef = React.createRef<Table>();
  constructor(props: BeatTagsPageProps) {
    super(props);

    this.state = {
      beat: null,
      notifications: [],
    };
  }

  public async componentWillMount() {
    await this.getBeat();
  }

  public render() {
    const { beat } = this.state;
    return (
      <div>
        <Table
          actionHandler={this.handleTableAction}
          assignmentOptions={null}
          assignmentTitle={null}
          items={beat ? beat.full_tags : []}
          ref={this.tableRef}
          showAssignmentOptions={false}
          type={BeatDetailTagsTable}
        />

        <EuiGlobalToastList
          toasts={this.state.notifications}
          dismissToast={() => this.setState({ notifications: [] })}
          toastLifeTimeMs={5000}
        />
      </div>
    );
  }

  private getSelectedTags = () => {
    return get(this.tableRef, 'current.state.selection', []);
  };

  private setUpdatedTagNotification = (
    numRemoved: number,
    totalTags: number,
    action: 'remove' | 'add'
  ) => {
    const { beat } = this.state;
    const actionName = action === 'remove' ? 'Removed' : 'Added';
    const preposition = action === 'remove' ? 'from' : 'to';
    this.setState({
      notifications: this.state.notifications.concat({
        title: `Tags ${actionName} ${preposition} Beat`,
        color: 'success',
        id: moment.now(),
        text: (
          <p>{`${actionName} ${numRemoved} of ${totalTags} tags ${preposition} ${
            beat ? beat.name || beat.id : 'beat'
          }`}</p>
        ),
      }),
    });
  };

  private handleTableAction = async (action: string, payload: any) => {
    switch (action) {
      case 'add':
        await this.associateTagsToBeat();
        break;
      case 'remove':
        await this.disassociateTagsFromBeat();
        break;
      case 'search':
        // TODO: add search filtering for tag names
        // awaiting an ES filter endpoint
        break;
    }
    this.getBeat();
  };

  private associateTagsToBeat = async () => {
    const { beat } = this.state;

    if (!beat) {
      throw new Error('Beat cannot be undefined');
    }

    const tagsToAssign = this.getSelectedTags().filter(
      (tag: any) => !beat.full_tags.some(({ id }) => tag.id === id)
    );
    const assignments = tagsToAssign.map((tag: any) => {
      return {
        beatId: beat.id,
        tag: tag.id,
      };
    });

    await this.props.libs.beats.assignTagsToBeats(assignments);
    this.setUpdatedTagNotification(assignments.length, tagsToAssign.length, 'add');
  };

  private disassociateTagsFromBeat = async () => {
    const { beat } = this.state;

    if (!beat) {
      throw new Error('Beat cannot be undefined');
    }

    const tagsToDisassociate = this.getSelectedTags().filter((tag: any) =>
      beat.full_tags.some(({ id }) => tag.id === id)
    );
    const assignments = tagsToDisassociate.map((tag: any) => {
      return {
        beatId: beat.id,
        tag: tag.id,
      };
    });

    await this.props.libs.beats.removeTagsFromBeats(assignments);
    this.setUpdatedTagNotification(assignments.length, tagsToDisassociate.length, 'remove');
  };

  private getBeat = async () => {
    try {
      const beat = await this.props.libs.beats.get(this.props.beatId);
      this.setState({ beat });
    } catch (e) {
      throw new Error(e);
    }
  };
}
