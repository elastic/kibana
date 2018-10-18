/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList } from '@elastic/eui';
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
          hideTableControls={true}
          items={beat ? beat.full_tags : []}
          ref={this.tableRef}
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

  private getBeat = async () => {
    try {
      const beat = await this.props.libs.beats.get(this.props.beatId);
      this.setState({ beat });
    } catch (e) {
      throw new Error(e);
    }
  };
}
