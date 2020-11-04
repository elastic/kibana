/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiGlobalToastList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { Breadcrumb } from '../../components/navigation/breadcrumb';
import { BeatDetailTagsTable, Table } from '../../components/table';
import { FrontendLibs } from '../../lib/types';

interface BeatTagsPageProps {
  beat: CMBeat;
  libs: FrontendLibs;
  refreshBeat(): void;
}

interface BeatTagsPageState {
  notifications: any[];
  tags: BeatTag[];
}

export class BeatTagsPage extends React.PureComponent<BeatTagsPageProps, BeatTagsPageState> {
  private tableRef = React.createRef<Table>();
  constructor(props: BeatTagsPageProps) {
    super(props);

    this.state = {
      notifications: [],
      tags: [],
    };
  }

  public UNSAFE_componentWillMount() {
    this.updateBeatsData();
  }

  public async updateBeatsData() {
    const tags = await this.props.libs.tags.getTagsWithIds(this.props.beat.tags);
    this.setState({
      tags,
    });
  }

  public render() {
    const { beat } = this.props;
    return (
      <React.Fragment>
        <Breadcrumb
          title={i18n.translate('xpack.beatsManagement.breadcrumb.beatTags', {
            defaultMessage: 'Beat tags for: {beatId}',
            values: { beatId: beat.id },
          })}
          path={`/beat/${beat.id}/tags`}
        />

        <Table
          hideTableControls={true}
          items={this.state.tags}
          ref={this.tableRef}
          type={BeatDetailTagsTable}
        />

        <EuiGlobalToastList
          toasts={this.state.notifications}
          dismissToast={() => this.setState({ notifications: [] })}
          toastLifeTimeMs={5000}
        />
      </React.Fragment>
    );
  }
}
