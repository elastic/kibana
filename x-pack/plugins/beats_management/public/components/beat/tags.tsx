/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList } from '@elastic/eui';
import { get } from 'lodash';
import React from 'react';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { ClientSideBeatTag, FrontendLibs } from '../../lib/lib';
import { BeatDetailTagsTable, Table } from '../table';

interface BeatTagsViewProps {
  beat: CMPopulatedBeat | undefined;
  libs: FrontendLibs;
  reloadBeat(): void;
}

interface BeatTagsViewState {
  notifications: any[];
  tags: ClientSideBeatTag[];
}

export class BeatTagsView extends React.PureComponent<BeatTagsViewProps, BeatTagsViewState> {
  private tableRef = React.createRef<Table>();

  constructor(props: BeatTagsViewProps) {
    super(props);

    this.state = {
      notifications: [],
      tags: [],
    };

    this.getTags();
  }

  public render() {
    return (
      <div>
        <Table
          actionHandler={this.handleTableAction}
          assignmentOptions={null}
          assignmentTitle={null}
          items={this.state.tags}
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
    const actionName = action === 'remove' ? 'Removed' : 'Added';
    const preposition = action === 'remove' ? 'from' : 'to';
    this.setState({
      notifications: this.state.notifications.concat({
        title: `Tags ${actionName} ${preposition} Beat`,
        color: 'success',
        text: (
          <p>{`${actionName} ${numRemoved} of ${totalTags} tags ${preposition} ${
            this.props.beat ? this.props.beat.id : 'beat'
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
    this.props.reloadBeat();
  };

  private associateTagsToBeat = async () => {
    const { beat } = this.props;

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
    const { beat } = this.props;

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

  private getTags = async () => {
    try {
      this.setState({ tags: await this.props.libs.tags.getAll() });
    } catch (e) {
      throw new Error(e);
    }
  };
}
