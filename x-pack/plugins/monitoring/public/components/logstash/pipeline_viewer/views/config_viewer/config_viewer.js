/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';

import { DetailDrawer } from '../detail_drawer';

import { renderSection } from './statement_section';
import { getStatementListFromPipeline } from './statement_list';

export class ConfigViewer extends React.Component {
  constructor() {
    super();
    this.state = {
      detailDrawer: {
        vertex: null
      }
    };
  }

  onShowVertexDetails = (vertex) => {
    if (vertex === this.state.detailDrawer.vertex) {
      this.onHideVertexDetails();
    }
    else {
      this.setState({
        detailDrawer: {
          vertex
        }
      });
    }
  }

  onHideVertexDetails = () => {
    this.setState({
      detailDrawer: {
        vertex: null
      }
    });
  }

  renderDetailDrawer = () => {
    if (!this.state.detailDrawer.vertex) {
      return null;
    }

    return (
      <DetailDrawer
        vertex={this.state.detailDrawer.vertex}
        onHide={this.onHideVertexDetails}
        timeseriesTooltipXValueFormatter={this.props.timeseriesTooltipXValueFormatter}
      />
    );
  }

  render() {
    const {
      pipeline
    } = this.props;

    return (
      <div>
        {
          getStatementListFromPipeline(pipeline, this.onShowVertexDetails).map(section => renderSection(section))
        }
        { this.renderDetailDrawer() }
      </div>
    );
  }
}
