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

import { detectorToString } from 'plugins/ml/util/string_utils';
import { formatValues } from './format_values';

import './styles/main.less';

function filterObjects(obj, allowArrays, allowObjects) {
  return Object.keys(obj)
    .filter(k => (allowObjects || typeof obj[k] !== 'object' || (allowArrays && Array.isArray(obj[k]))))
    .map((k) => {
      let item = obj[k];
      if (Array.isArray(item)) {
        item = item.join(', ');
      } else if (typeof obj[k] === 'object') {
        item = JSON.stringify(item);
      }
      return ([k, item]);
    });
}

function SectionItem({ item }) {
  return (
    <EuiTableRow>
      {item[0] !== '' &&
        <EuiTableRowCell>
          <span className="job-config-item item-header">{item[0]}</span>
        </EuiTableRowCell>
      }
      <EuiTableRowCell>
        <span className="job-config-item">{item[1]}</span>
      </EuiTableRowCell>
    </EuiTableRow>
  );
}


function Section({ section, index }) {
  if (section.items.length === 0) {
    return <div key={index} />;
  }

  return (
    <React.Fragment>
      <EuiTitle size="xs"><h4>{section.title}</h4></EuiTitle>
      <div className="ml-job-section-container">
        <EuiTable compressed={true}>
          <EuiTableBody>
            { section.items.map((item, i) => (<SectionItem item={item} key={i} />)) }
          </EuiTableBody>
        </EuiTable>
      </div>
    </React.Fragment>
  );
}

function SectionPane({ sections }) {
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
      const generalSection = {
        title: 'General',
        position: 'left',
        items: filterObjects(job, true).map(formatValues)
      };


      const customUrlSection = {
        title: 'Custom URLs',
        position: 'right',
        items: []
      };
      if (job.custom_settings && job.custom_settings.custom_urls) {
        customUrlSection.items.push(...job.custom_settings.custom_urls.map(cu => [cu.url_name, cu.url_value]));
      }

      const nodeSection = {
        title: 'Node',
        position: 'right',
        items: []
      };
      if (job.node) {
        nodeSection.items.push(['name', job.node.name]);
      }

      const detectorsSection = {
        title: 'Detectors',
        position: 'left',
        items: []
      };
      if (job.analysis_config && job.analysis_config.detectors) {
        detectorsSection.items.push(...job.analysis_config.detectors.map((d) => {
          const stringifiedDtr = detectorToString(d);
          console.log(stringifiedDtr, d);
          return [
            stringifiedDtr,
            (stringifiedDtr !== d.detector_description) ? d.detector_description : ''
          ];
        }));
      }

      const influencers = {
        title: 'Influencers',
        position: 'left',
        items: job.analysis_config.influencers.map(i => ['', i])
      };

      const analysisConfig = {
        title: 'Analysis config',
        position: 'left',
        items: filterObjects(job.analysis_config)
      };

      const analysisLimits = {
        title: 'Analysis limits',
        position: 'left',
        items: filterObjects(job.analysis_limits)
      };

      const dataDescription = {
        title: 'Data description',
        position: 'right',
        items: filterObjects(job.data_description)
      };

      const datafeed = {
        title: 'Datafeed',
        position: 'left',
        items: filterObjects(job.datafeed_config, true, true)
      };
      if (job.node) {
        datafeed.items.push(['node', JSON.stringify(job.node)]);
      }

      const counts = {
        title: 'Counts',
        position: 'left',
        items: filterObjects(job.data_counts).map(formatValues)
      };

      const modelSizeStats = {
        title: 'Model size stats',
        position: 'right',
        items: filterObjects(job.model_size_stats).map(formatValues)
      };

      const tabs = [{
        id: 'job-settings',
        name: 'Job settings',
        content: <SectionPane sections={[generalSection, customUrlSection, nodeSection]} />,
      }, {
        id: 'job-config',
        name: 'Job config',
        content: <SectionPane sections={[detectorsSection, influencers, analysisConfig, analysisLimits, dataDescription]} />,
      }, {
        id: 'datafeed',
        name: 'Datafeed',
        content: <SectionPane sections={[datafeed]} />,
      }, {
        id: 'counts',
        name: 'Counts',
        content: <SectionPane sections={[counts, modelSizeStats]} />,
      }
      ];


      return (
        <div className="expanded-job">
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
