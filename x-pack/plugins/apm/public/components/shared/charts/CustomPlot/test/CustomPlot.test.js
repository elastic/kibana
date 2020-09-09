/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import {
  disableConsoleWarning,
  toJson,
  mountWithTheme,
} from '../../../../../utils/testHelpers';
import { InnerCustomPlot } from '../index';
import responseWithData from './responseWithData.json';
import VoronoiPlot from '../VoronoiPlot';
import InteractivePlot from '../InteractivePlot';
import { getResponseTimeSeries } from '../../../../../selectors/chartSelectors';
import { getEmptySeries } from '../getEmptySeries';

function getXValueByIndex(index) {
  return responseWithData.responseTimes.avg[index].x;
}

describe('when response has data', () => {
  let consoleMock;
  let wrapper;
  let onHover;
  let onMouseLeave;
  let onSelectionEnd;

  beforeAll(() => {
    consoleMock = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  beforeEach(() => {
    const series = getResponseTimeSeries({ apmTimeseries: responseWithData });
    onHover = jest.fn();
    onMouseLeave = jest.fn();
    onSelectionEnd = jest.fn();
    wrapper = mountWithTheme(
      <InnerCustomPlot
        series={series}
        onHover={onHover}
        onMouseLeave={onMouseLeave}
        onSelectionEnd={onSelectionEnd}
        width={800}
        tickFormatX={(x) => x.getTime()} // Avoid timezone issues in snapshots
      />
    );

    // Spy on render methods to determine if they re-render
    jest.spyOn(VoronoiPlot.prototype, 'render').mockClear();
    jest.spyOn(InteractivePlot.prototype, 'render').mockClear();
  });

  describe('Initially', () => {
    it('should have 3 enabled series', () => {
      expect(wrapper.find('LineSeries').length).toBe(3);
    });

    it('should have 3 legends ', () => {
      const legends = wrapper.find('Legend');
      expect(legends.length).toBe(3);
      expect(legends.map((e) => e.props())).toMatchSnapshot();
    });

    it('should have 3 XY plots', () => {
      expect(wrapper.find('StaticPlot XYPlot').length).toBe(1);
      expect(wrapper.find('InteractivePlot XYPlot').length).toBe(1);
      expect(wrapper.find('VoronoiPlot XYPlot').length).toBe(1);
    });

    it('should have correct state', () => {
      expect(wrapper.state().seriesEnabledState).toEqual([]);
      expect(wrapper.state().isDrawing).toBe(false);
      expect(wrapper.state().selectionStart).toBe(null);
      expect(wrapper.state().selectionEnd).toBe(null);
      expect(wrapper.state()).toMatchSnapshot();
    });

    it('should not display tooltip', () => {
      expect(wrapper.find('Tooltip').length).toEqual(0);
    });

    it('should have correct markup', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Legends', () => {
    it('should have initial values when nothing is clicked', () => {
      expect(wrapper.state('seriesEnabledState')).toEqual([]);
      expect(wrapper.find('StaticPlot').prop('series').length).toBe(3);
    });

    describe('when legend is clicked once', () => {
      beforeEach(() => {
        wrapper.find('Legend').at(1).simulate('click');
      });

      it('should have 2 enabled series', () => {
        expect(wrapper.find('LineSeries').length).toBe(2);
      });

      it('should add disabled prop to Legends', () => {
        expect(
          wrapper.find('Legend').map((node) => node.prop('disabled'))
        ).toEqual([false, true, false]);
      });

      it('should toggle series ', () => {
        expect(wrapper.state('seriesEnabledState')).toEqual([
          false,
          true,
          false,
        ]);
        expect(wrapper.find('StaticPlot').prop('series').length).toBe(2);
      });

      it('should re-render VoronoiPlot', () => {
        expect(VoronoiPlot.prototype.render.mock.calls.length).toBe(1);
      });

      it('should re-render InteractivePlot', () => {
        expect(InteractivePlot.prototype.render.mock.calls.length).toEqual(1);
      });
    });

    describe('when legend is clicked twice', () => {
      beforeEach(() => {
        wrapper.find('Legend').at(1).simulate('click').simulate('click');
      });

      it('should toggle series back to initial state', () => {
        expect(
          wrapper.find('Legend').map((node) => node.prop('disabled'))
        ).toEqual([false, false, false]);

        expect(wrapper.state('seriesEnabledState')).toEqual([
          false,
          false,
          false,
        ]);

        expect(wrapper.find('StaticPlot').prop('series').length).toBe(3);
      });

      it('should re-render VoronoiPlot', () => {
        expect(VoronoiPlot.prototype.render.mock.calls.length).toBe(2);
      });

      it('should re-render InteractivePlot', () => {
        expect(InteractivePlot.prototype.render.mock.calls.length).toEqual(2);
      });
    });
  });

  describe('when hovering over', () => {
    const index = 22;
    beforeEach(() => {
      wrapper.find('.rv-voronoi__cell').at(index).simulate('mouseOver');
    });

    it('should call onHover', () => {
      expect(onHover).toHaveBeenCalledWith(getXValueByIndex(index));
    });
  });

  describe('when setting hoverX', () => {
    beforeEach(() => {
      // Avoid timezone issues in snapshots
      jest.spyOn(moment.prototype, 'format').mockImplementation(function () {
        return this.unix();
      });

      // Simulate hovering over multiple buckets
      wrapper.setProps({ hoverX: getXValueByIndex(13) });
      wrapper.setProps({ hoverX: getXValueByIndex(14) });
      wrapper.setProps({ hoverX: getXValueByIndex(15) });
    });

    it('should display tooltip', () => {
      expect(wrapper.find('Tooltip').length).toEqual(1);
      expect(wrapper.find('Tooltip').prop('tooltipPoints')).toMatchSnapshot();
    });

    it('should display vertical line at correct time', () => {
      expect(
        wrapper.find('InteractivePlot VerticalGridLines').prop('tickValues')
      ).toEqual([1502283720000]);
    });

    it('should not re-render VoronoiPlot', () => {
      expect(VoronoiPlot.prototype.render.mock.calls.length).toBe(0);
    });

    it('should re-render InteractivePlot', () => {
      expect(InteractivePlot.prototype.render.mock.calls.length).toEqual(3);
    });

    it('should match snapshots', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
      expect(wrapper.state()).toMatchSnapshot();
    });
  });

  describe('when dragging without releasing', () => {
    beforeEach(() => {
      wrapper.find('.rv-voronoi__cell').at(10).simulate('mouseDown');

      wrapper.find('.rv-voronoi__cell').at(20).simulate('mouseOver');
    });

    it('should display SelectionMarker', () => {
      expect(toJson(wrapper.find('SelectionMarker'))).toMatchSnapshot();
    });

    it('should not call onSelectionEnd', () => {
      expect(onSelectionEnd).not.toHaveBeenCalled();
    });
  });

  describe('when dragging from left to right and releasing', () => {
    beforeEach(() => {
      wrapper.find('.rv-voronoi__cell').at(10).simulate('mouseDown');

      wrapper.find('.rv-voronoi__cell').at(20).simulate('mouseOver');
      document.body.dispatchEvent(new Event('mouseup'));
    });

    it('should call onSelectionEnd', () => {
      expect(onSelectionEnd).toHaveBeenCalledWith({
        start: 1502283420000,
        end: 1502284020000,
      });
    });
  });

  describe('when dragging from right to left and releasing', () => {
    beforeEach(() => {
      wrapper.find('.rv-voronoi__cell').at(20).simulate('mouseDown');

      wrapper.find('.rv-voronoi__cell').at(10).simulate('mouseOver');
      document.body.dispatchEvent(new Event('mouseup'));
    });

    it('should call onSelectionEnd', () => {
      expect(onSelectionEnd).toHaveBeenCalledWith({
        start: 1502283420000,
        end: 1502284020000,
      });
    });
  });

  it('should call onMouseLeave when leaving the XY plot', () => {
    wrapper.find('VoronoiPlot svg.rv-xy-plot__inner').simulate('mouseLeave');
    expect(onMouseLeave).toHaveBeenCalledWith(expect.any(Object));
  });
});

describe('when response has no data', () => {
  const onHover = jest.fn();
  const onMouseLeave = jest.fn();
  const onSelectionEnd = jest.fn();
  const annotations = [
    {
      type: 'version',
      id: '2020-06-10 04:36:31',
      '@timestamp': 1591763925012,
      text: '2020-06-10 04:36:31',
    },
    {
      type: 'version',
      id: '2020-06-10 15:23:01',
      '@timestamp': 1591802689233,
      text: '2020-06-10 15:23:01',
    },
  ];

  let wrapper;
  beforeEach(() => {
    const series = getEmptySeries(1451606400000, 1451610000000);

    wrapper = mountWithTheme(
      <InnerCustomPlot
        annotations={annotations}
        series={series}
        onHover={onHover}
        onMouseLeave={onMouseLeave}
        onSelectionEnd={onSelectionEnd}
        width={800}
        tickFormatX={(x) => x.getTime()} // Avoid timezone issues in snapshots
      />
    );
  });

  describe('Initially', () => {
    it('should have 0 legends ', () => {
      expect(wrapper.find('Legend').length).toBe(0);
    });

    it('should have 2 XY plots', () => {
      expect(wrapper.find('StaticPlot XYPlot').length).toBe(1);
      expect(wrapper.find('InteractivePlot XYPlot').length).toBe(1);
      expect(wrapper.find('VoronoiPlot XYPlot').length).toBe(0);
    });

    it('should have correct state', () => {
      expect(wrapper.state().seriesEnabledState).toEqual([]);
      expect(wrapper.state().isDrawing).toBe(false);
      expect(wrapper.state().selectionStart).toBe(null);
      expect(wrapper.state().selectionEnd).toBe(null);
      expect(wrapper.state()).toMatchSnapshot();
    });

    it('should not display tooltip', () => {
      expect(wrapper.find('Tooltip').length).toEqual(0);
    });

    it('should not show annotations', () => {
      expect(wrapper.find('AnnotationsPlot')).toHaveLength(0);
    });

    it('should have correct markup', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    it('should have a single series', () => {
      expect(wrapper.prop('series').length).toBe(1);
    });

    it('The series is empty and every y-value is null', () => {
      expect(wrapper.prop('series')[0].data.every((d) => d.y === null)).toEqual(
        true
      );
    });
  });
});
