/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { DetailDrawer } from './detail_drawer';
import { Queue } from './queue';
import { StatementSection } from './statement_section';
import { injectI18n } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiPage,
  EuiPageContent,
  EuiPageBody,
} from '@elastic/eui';

class PipelineViewerUi extends React.Component {
  constructor() {
    super();
    this.state = {
      detailDrawer: {
        vertex: null
      }
    };
  }

  renderDetailDrawer = () => {
    if (!this.props.detailVertex) {
      return null;
    }

    return (
      <DetailDrawer
        vertex={this.props.detailVertex}
        onHide={() => this.props.setDetailVertexId(undefined)}
        timeseriesTooltipXValueFormatter={this.props.timeseriesTooltipXValueFormatter}
      />
    );
  }

  render() {
    const {
      inputs,
      filters,
      outputs,
      queue
    } = this.props.pipeline;
    const { intl } = this.props;

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent verticalPosition="center" horizontalPosition="center" className="monPipelineViewer">
            <StatementSection
              iconType="logstashInput"
              headingText={intl.formatMessage({ id: 'xpack.monitoring.logstash.pipelineViewer.inputsTitle', defaultMessage: 'Inputs' })}
              elements={inputs}
              onShowVertexDetails={this.props.setDetailVertexId}
            />
            <EuiSpacer />
            <Queue queue={queue} />
            <EuiSpacer />
            <StatementSection
              iconType="logstashFilter"
              headingText={intl.formatMessage({ id: 'xpack.monitoring.logstash.pipelineViewer.filtersTitle', defaultMessage: 'Filters' })}
              elements={filters}
              onShowVertexDetails={this.props.setDetailVertexId}
            />
            <EuiSpacer />
            <StatementSection
              iconType="logstashOutput"
              headingText={intl.formatMessage({ id: 'xpack.monitoring.logstash.pipelineViewer.outputsTitle', defaultMessage: 'Outputs' })}
              elements={outputs}
              onShowVertexDetails={this.props.setDetailVertexId}
            />
            { this.renderDetailDrawer() }
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

PipelineViewerUi.propTypes = {
  pipeline: PropTypes.shape({
    inputs: PropTypes.array.isRequired,
    filters: PropTypes.array.isRequired,
    outputs: PropTypes.array.isRequired,
    queue: PropTypes.object.isRequired,
  }).isRequired
};

export const PipelineViewer = injectI18n(PipelineViewerUi);
