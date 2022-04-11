/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./tooltip_popover', () => ({
  TooltipPopover: () => {
    return <div>mockTooltipPopover</div>;
  },
}));

import sinon from 'sinon';
import React from 'react';
import { mount, shallow } from 'enzyme';
import { Feature } from 'geojson';
import type { Map as MbMap, MapMouseEvent, MapboxGeoJSONFeature } from '@kbn/mapbox-gl';
import { TooltipControl } from './tooltip_control';
import { IVectorLayer } from '../../../classes/layers/vector_layer';

// mutable map state
let featuresAtLocation: MapboxGeoJSONFeature[] = [];

const layerId = 'tfi3f';
const mbLayerId = 'tfi3f_circle';
const mockLayer = {
  getMbLayerIds: () => {
    return [mbLayerId];
  },
  getId: () => {
    return layerId;
  },
  isVisible: () => {
    return true;
  },
  canShowTooltip: () => {
    return true;
  },
  getMbTooltipLayerIds: () => {
    return ['foo', 'bar'];
  },
  getFeatureId: (feature: Feature) => {
    return feature.properties?.__kbn__feature_id__;
  },
  getFeatureById: () => {
    return {
      geometry: {
        coordinates: [
          [
            [-67.5, 40.9799],
            [-90, 40.9799],
            [-90, 21.94305],
            [-67.5, 21.94305],
            [-67.5, 40.9799],
          ],
        ],
        type: 'Polygon',
      },
    };
  },
} as unknown as IVectorLayer;

const mockMbMapHandlers: { [key: string]: (event?: MapMouseEvent) => void } = {};
const mockMBMap = {
  on: (eventName: string, callback: (event?: MapMouseEvent) => void) => {
    mockMbMapHandlers[eventName] = callback;
  },
  off: (eventName: string) => {
    delete mockMbMapHandlers[eventName];
  },
  getLayer: () => {},
  queryRenderedFeatures: () => {
    return featuresAtLocation;
  },
} as unknown as MbMap;

const defaultProps = {
  mbMap: mockMBMap,
  closeOnClickTooltip: () => {},
  openOnClickTooltip: () => {},
  closeOnHoverTooltip: () => {},
  openOnHoverTooltip: () => {},
  layerList: [mockLayer],
  isDrawingFilter: false,
  addFilters: async () => {},
  geoFieldNames: [],
  openTooltips: [],
  hasLockedTooltips: false,
  filterModeActive: false,
  drawModeActive: false,
};

const hoverTooltipState = {
  id: '1',
  isLocked: false,
  location: [-120, 30] as [number, number],
  features: [
    {
      id: 1,
      layerId,
      mbProperties: {},
      actions: [],
    },
  ],
};

const lockedTooltipState = {
  id: '2',
  isLocked: true,
  location: [-120, 30] as [number, number],
  features: [
    {
      id: 1,
      layerId,
      mbProperties: {},
      actions: [],
    },
  ],
};

describe('TooltipControl', () => {
  beforeEach(() => {
    featuresAtLocation = [];
  });

  describe('render', () => {
    test('should not render tooltips when there are no open tooltips', () => {
      const component = shallow(<TooltipControl {...defaultProps} />);

      expect(component).toMatchSnapshot();
    });

    test('should render hover tooltip', () => {
      const component = shallow(
        <TooltipControl {...defaultProps} openTooltips={[hoverTooltipState]} />
      );

      expect(component).toMatchSnapshot();
    });

    test('should render locked tooltip', () => {
      const component = shallow(
        <TooltipControl
          {...defaultProps}
          hasLockedTooltips={true}
          openTooltips={[lockedTooltipState]}
        />
      );

      expect(component).toMatchSnapshot();
    });

    test('should un-register all map callbacks on unmount', () => {
      const component = mount(<TooltipControl {...defaultProps} />);

      expect(Object.keys(mockMbMapHandlers).length).toBe(4);

      component.unmount();
      expect(Object.keys(mockMbMapHandlers).length).toBe(0);
    });
  });

  describe('on mouse out', () => {
    const closeOnHoverTooltipStub = sinon.stub();

    beforeEach(() => {
      closeOnHoverTooltipStub.reset();
    });

    test('should clear hover tooltip state', () => {
      mount(
        <TooltipControl
          {...defaultProps}
          closeOnHoverTooltip={closeOnHoverTooltipStub}
          openTooltips={[hoverTooltipState]}
        />
      );

      mockMbMapHandlers.mouseout();

      sinon.assert.calledOnce(closeOnHoverTooltipStub);
    });

    test('should not clear locked tooltip state', () => {
      mount(
        <TooltipControl
          {...defaultProps}
          closeOnHoverTooltip={closeOnHoverTooltipStub}
          hasLockedTooltips={true}
          openTooltips={[lockedTooltipState]}
        />
      );

      mockMbMapHandlers.mouseout();

      sinon.assert.notCalled(closeOnHoverTooltipStub);
    });
  });

  describe('on click', () => {
    const mockMapMouseEvent = {
      point: { x: 0, y: 0 },
      lngLat: { lng: 0, lat: 0 },
    } as unknown as MapMouseEvent;
    const openOnClickTooltipStub = sinon.stub();
    const closeOnClickTooltipStub = sinon.stub();

    beforeEach(() => {
      openOnClickTooltipStub.reset();
      closeOnClickTooltipStub.reset();
    });

    test('should ignore clicks when map is in drawing mode', () => {
      mount(
        <TooltipControl
          {...defaultProps}
          closeOnClickTooltip={closeOnClickTooltipStub}
          openOnClickTooltip={openOnClickTooltipStub}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.notCalled(closeOnClickTooltipStub);
      sinon.assert.notCalled(openOnClickTooltipStub);
    });

    test('should not open tooltip when there are no features at clicked location', () => {
      featuresAtLocation = [];
      mount(
        <TooltipControl
          {...defaultProps}
          closeOnClickTooltip={closeOnClickTooltipStub}
          openOnClickTooltip={openOnClickTooltipStub}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.notCalled(closeOnClickTooltipStub);
      sinon.assert.notCalled(openOnClickTooltipStub);
    });

    test('should set tooltip state when there are features at clicked location and remove duplicate features', () => {
      const feature = {
        geometry: {
          type: 'Point',
          coordinates: [100, 30],
        },
        layer: {
          id: mbLayerId,
        },
        properties: {
          __kbn__feature_id__: 1,
        },
      } as unknown as MapboxGeoJSONFeature;
      featuresAtLocation = [feature, feature];
      mount(
        <TooltipControl
          {...defaultProps}
          closeOnClickTooltip={closeOnClickTooltipStub}
          openOnClickTooltip={openOnClickTooltipStub}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.notCalled(closeOnClickTooltipStub);
      const tooltipState = openOnClickTooltipStub.getCalls()[0].args[0];
      expect(tooltipState.features.length).toBe(1);
      expect(tooltipState.location).toEqual([100, 30]);
    });
  });
});
