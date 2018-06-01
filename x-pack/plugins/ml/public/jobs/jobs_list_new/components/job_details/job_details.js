/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component
} from 'react';

import {
  EuiTitle,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiSpacer,
  EuiTabbedContent
} from '@elastic/eui';

import './styles/main.less';

import { extractJobDetails } from './extract_job_details';
import { JsonPane } from './json_tab';
import { DatafeedPreviewPane } from './datafeed_preview_tab';
import { ForecastsTable } from './forecasts_table';

function SectionItem({ item }) {
  return (
    <EuiTableRow>
      {item[0] !== '' &&
        <EuiTableRowCell>
          <span className="job-item header">{item[0]}</span>
        </EuiTableRowCell>
      }
      <EuiTableRowCell>
        <span className="job-item">{item[1]}</span>
      </EuiTableRowCell>
    </EuiTableRow>
  );
}


function Section({ section }) {
  if (section.items.length === 0) {
    return <div />;
  }

  return (
    <React.Fragment>
      <EuiTitle size="xs"><h4>{section.title}</h4></EuiTitle>
      <div className="job-section">
        <EuiTable compressed={true}>
          <EuiTableBody>
            { section.items.map((item, i) => (<SectionItem item={item} key={i} />)) }
          </EuiTableBody>
        </EuiTable>
      </div>
    </React.Fragment>
  );
}

function JobDetailsPane({ sections }) {
  return (
    <React.Fragment>
      <EuiSpacer size="s" />
      <div className="row">
        <div className="col-md-6">
          {
            sections
              .filter(s => s.position === 'left')
              .map((s, i) => (<Section section={s} key={i} />))
          }
        </div>
        <div className="col-md-6">
          {
            sections
              .filter(s => s.position === 'right')
              .map((s, i) => (<Section section={s} key={i} />))
          }
        </div>
      </div>
    </React.Fragment>
  );
}

export class JobDetails extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  // static getDerivedStateFromProps(props, state) {
  //   const { job, loading } = props;
  //   // debugger
  //   return { job, loading };
  // }

  render() {
    const { job } = this.props;
    if (job === undefined) {
      return (
        <div>loading</div>
      );
    } else {

      const {
        general,
        customUrl,
        node,
        detectors,
        influencers,
        analysisConfig,
        analysisLimits,
        dataDescription,
        datafeed,
        counts,
        modelSizeStats
      } = extractJobDetails(job);

      const tabs = [{
        id: 'job-settings',
        name: 'Job settings',
        content: <JobDetailsPane sections={[general, customUrl, node]} />,
      }, {
        id: 'job-config',
        name: 'Job config',
        content: <JobDetailsPane sections={[detectors, influencers, analysisConfig, analysisLimits, dataDescription]} />,
      }, {
        id: 'datafeed',
        name: 'Datafeed',
        content: <JobDetailsPane sections={[datafeed]} />,
      }, {
        id: 'counts',
        name: 'Counts',
        content: <JobDetailsPane sections={[counts, modelSizeStats]} />,
      }, {
        id: 'json',
        name: 'JSON',
        content: <JsonPane job={job} />,
      }, {
        id: 'job-message',
        name: 'Job messages',
        content: <div />,
      }, {
        id: 'datafeed-preview',
        name: 'Datafeed preview',
        content: <DatafeedPreviewPane job={job} />,
      }, {
        id: 'forecasts',
        name: 'Forecasts',
        content: <ForecastsTable job={job} />,
      }
      ];

      return (
        <div className="tab-contents">
          <EuiTabbedContent
            tabs={tabs}
            initialSelectedTab={tabs[0]}
            onTabClick={(tab) => { console.log('clicked tab', tab); }}
          />
        </div>
      );
    }
  }
}
