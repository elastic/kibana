/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { getLastValue } from './get_last_value';
import { TimeseriesContainer } from './timeseries_container';
import { HorizontalLegend } from './horizontal_legend';
import { getValuesForSeriesIndex, getValuesByX } from './get_values_for_legend';
import { DEBOUNCE_SLOW_MS } from '../../../common/constants';
import './timeseries_visualization.scss';

export class TimeseriesVisualization extends React.Component {
  constructor(props) {
    super(props);

    this.debouncedUpdateLegend = _.debounce(this.updateLegend, DEBOUNCE_SLOW_MS);
    this.debouncedUpdateLegend = this.debouncedUpdateLegend.bind(this);

    this.toggleFilter = this.toggleFilter.bind(this);

    const values = this.getLastValues(props);

    this.state = {
      values: {},
      seriesToShow: _.keys(values),
      ignoreVisibilityUpdates: false,
    };
  }

  filterLegend(id) {
    if (!_.has(this.state.values, id)) {
      return [];
    }

    const notAllShown = _.keys(this.state.values).length !== this.state.seriesToShow.length;
    const isCurrentlyShown = _.includes(this.state.seriesToShow, id);
    const seriesToShow = [];

    if (notAllShown && isCurrentlyShown) {
      this.setState({
        ignoreVisibilityUpdates: false,
        seriesToShow: Object.keys(this.state.values),
      });
    } else {
      seriesToShow.push(id);
      this.setState({
        ignoreVisibilityUpdates: true,
        seriesToShow: [id],
      });
    }

    return seriesToShow;
  }

  toggleFilter(_event, id) {
    const seriesToShow = this.filterLegend(id);

    if (_.isFunction(this.props.onFilter)) {
      this.props.onFilter(seriesToShow);
    }
  }

  getLastValues(props) {
    props = props || this.props;
    const values = {};

    props.series.forEach((row) => {
      // we need a valid identifier
      if (!row.id) {
        row.id = row.label;
      }
      values[row.id] = getLastValue(row.data);
    });

    return values;
  }

  updateLegend(pos, item) {
    const values = {};

    if (pos) {
      // callback
      const setValueCallback = (seriesId, value) => {
        values[seriesId] = value;
      };

      if (item) {
        getValuesForSeriesIndex(this.props.series, item.dataIndex, setValueCallback);
      } else {
        getValuesByX(this.props.series, pos.x, setValueCallback);
      }
    } else {
      _.assign(values, this.getLastValues());
    }

    this.setState({ values });
  }

  UNSAFE_componentWillReceiveProps(props) {
    const values = this.getLastValues(props);
    const currentKeys = _.keys(this.state.values);
    const keys = _.keys(values);
    const diff = _.difference(keys, currentKeys);
    const nextState = { values: values };

    if (diff.length && !this.state.ignoreVisibilityUpdates) {
      nextState.seriesToShow = keys;
    }

    this.setState(nextState);
  }

  render() {
    const className = 'monRhythmChart';
    const style = {
      flexDirection: 'column', // for legend position = bottom
    };

    const legend = this.props.hasLegend ? (
      <HorizontalLegend
        seriesFilter={this.state.seriesToShow}
        seriesValues={this.state.values}
        onToggle={this.toggleFilter}
        {...this.props}
      />
    ) : null;

    return (
      <div className={className}>
        <div style={style} className="monRhythmChart__content">
          <div className="monRhythmChart__visualization">
            <TimeseriesContainer
              seriesToShow={this.state.seriesToShow}
              updateLegend={this.debouncedUpdateLegend}
              {...this.props}
            />
          </div>
          {legend}
        </div>
      </div>
    );
  }
}

TimeseriesVisualization.defaultProps = {
  hasLegend: true,
};
