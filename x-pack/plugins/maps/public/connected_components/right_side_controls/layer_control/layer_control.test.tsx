/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./layer_toc', () => ({
  LayerTOC: () => {
    return <div>mockLayerTOC</div>;
  },
}));

jest.mock('../../../kibana_services', () => ({
  isScreenshotMode: () => {
    return false;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

import { LayerControl } from './layer_control';
import { ILayer } from '../../../classes/layers/layer';

const defaultProps = {
  isReadOnly: false,
  showAddLayerWizard: async () => {},
  closeLayerTOC: () => {},
  openLayerTOC: () => {},
  hideAllLayers: () => {},
  showAllLayers: () => {},
  isLayerTOCOpen: true,
  layerList: [],
  isFlyoutOpen: false,
};

describe('LayerControl', () => {
  test('is rendered', () => {
    const component = shallow(<LayerControl {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  test('should disable buttons when flyout is open', () => {
    const component = shallow(<LayerControl {...defaultProps} isFlyoutOpen={true} />);

    expect(component).toMatchSnapshot();
  });

  test('isReadOnly', () => {
    const component = shallow(<LayerControl {...defaultProps} isReadOnly={true} />);

    expect(component).toMatchSnapshot();
  });

  describe('isLayerTOCOpen', () => {
    test('Should render expand button', () => {
      const component = shallow(<LayerControl {...defaultProps} isLayerTOCOpen={false} />);
      expect(component).toMatchSnapshot();
    });

    describe('spinner icon', () => {
      const isLayerLoading = true;
      let isVisible = true;
      const mockLayerThatIsLoading = {
        hasErrors: () => {
          return false;
        },
        isLayerLoading: () => {
          return isLayerLoading;
        },
        isVisible: () => {
          return isVisible;
        },
      } as unknown as ILayer;
      test('Should render expand button with loading icon when layer is loading', () => {
        const component = shallow(
          <LayerControl
            {...defaultProps}
            isLayerTOCOpen={false}
            layerList={[mockLayerThatIsLoading]}
          />
        );
        expect(component).toMatchSnapshot();
      });
      test('Should not render expand button with loading icon when layer is invisible', () => {
        isVisible = false;
        const component = shallow(
          <LayerControl
            {...defaultProps}
            isLayerTOCOpen={false}
            layerList={[mockLayerThatIsLoading]}
          />
        );
        expect(component).toMatchSnapshot();
      });
    });

    test('Should render expand button with error icon when layer has error', () => {
      const mockLayerThatHasError = {
        hasErrors: () => {
          return true;
        },
        isLayerLoading: () => {
          return false;
        },
      } as unknown as ILayer;
      const component = shallow(
        <LayerControl
          {...defaultProps}
          isLayerTOCOpen={false}
          layerList={[mockLayerThatHasError]}
        />
      );

      expect(component).toMatchSnapshot();
    });
  });
});
