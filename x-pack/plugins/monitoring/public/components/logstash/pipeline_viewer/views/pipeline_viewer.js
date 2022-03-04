/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { DetailDrawer } from './detail_drawer';
import { Queue } from './queue';
import { StatementSection } from './statement_section';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiPage, EuiPageContent, EuiPageBody, EuiScreenReaderOnly } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export class PipelineViewer extends React.Component {
  constructor() {
    super();
    this.state = {
      detailDrawer: {
        vertex: null,
      },
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
  };

  render() {
    const { inputs, filters, outputs, queue } = this.props.pipeline;

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.logstash.pipeline_viewer.heading"
                defaultMessage="Logstash pipelines"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            className="monPipelineViewer"
          >
            <StatementSection
              iconType="logstashInput"
              headingText={i18n.translate('xpack.monitoring.logstash.pipelineViewer.inputsTitle', {
                defaultMessage: 'Inputs',
              })}
              elements={inputs}
              onShowVertexDetails={this.props.setDetailVertexId}
            />
            <EuiSpacer />
            <Queue queue={queue} />
            <EuiSpacer />
            <StatementSection
              iconType="logstashFilter"
              headingText={i18n.translate('xpack.monitoring.logstash.pipelineViewer.filtersTitle', {
                defaultMessage: 'Filters',
              })}
              elements={filters}
              onShowVertexDetails={this.props.setDetailVertexId}
            />
            <EuiSpacer />
            <StatementSection
              iconType="logstashOutput"
              headingText={i18n.translate('xpack.monitoring.logstash.pipelineViewer.outputsTitle', {
                defaultMessage: 'Outputs',
              })}
              elements={outputs}
              onShowVertexDetails={this.props.setDetailVertexId}
            />
            {this.renderDetailDrawer()}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

PipelineViewer.propTypes = {
  pipeline: PropTypes.shape({
    inputs: PropTypes.array.isRequired,
    filters: PropTypes.array.isRequired,
    outputs: PropTypes.array.isRequired,
    queue: PropTypes.object.isRequired,
  }).isRequired,
};
