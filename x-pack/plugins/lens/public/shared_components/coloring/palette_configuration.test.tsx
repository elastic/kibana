/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { ReactWrapper } from 'enzyme';
import type { CustomPaletteParams } from '../../../common';
import { CustomizablePalette } from './palette_configuration';
import { act } from 'react-dom/test-utils';
import type { DataBounds } from './types';

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

// mocking isAllColorRangesValid function
jest.mock('./color_ranges/color_ranges_validation', () => {
  const original = jest.requireActual('./color_ranges/color_ranges_validation');

  return {
    ...original,
    isAllColorRangesValid: () => true,
  };
});

describe('palette panel', () => {
  const paletteRegistry = chartPluginMock.createPaletteRegistry();
  let props: {
    palettes: PaletteRegistry;
    activePalette: PaletteOutput<CustomPaletteParams>;
    setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
    dataBounds: DataBounds;
  };

  describe('palette picker', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'positive' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
        dataBounds: { min: 0, max: 100 },
      };

      jest.useFakeTimers();
    });

    function changePaletteIn(instance: ReactWrapper, newPaletteName: string) {
      return (
        instance
          .find('[data-test-subj="lnsPalettePanel_dynamicColoring_palette_picker"]')
          .at(1)
          .prop('onChange') as unknown as (value: string) => void
      )?.(newPaletteName);
    }

    it('should show only dynamic coloring enabled palette + custom option', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      const paletteOptions = instance
        .find('[data-test-subj="lnsPalettePanel_dynamicColoring_palette_picker"]')
        .at(1)
        .prop('palettes') as EuiColorPalettePickerPaletteProps[];
      expect(paletteOptions.length).toEqual(2);

      expect(paletteOptions[paletteOptions.length - 1]).toEqual({
        title: 'Custom Mocked Palette', // <- picks the title of the custom palette
        type: 'fixed',
        value: 'custom',
        palette: ['blue', 'yellow'],
        'data-test-subj': 'custom-palette',
      });
    });

    it('should set the colorStops and stops when selecting the Custom palette from the list', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);

      act(() => {
        changePaletteIn(instance, 'custom');
      });

      jest.advanceTimersByTime(250);

      expect(props.setPalette).toHaveBeenCalledWith({
        type: 'palette',
        name: 'custom',
        params: expect.objectContaining({
          colorStops: [
            { color: 'blue', stop: 0 },
            { color: 'yellow', stop: 50 },
          ],
          stops: [
            { color: 'blue', stop: 50 },
            { color: 'yellow', stop: 100 },
          ],
          name: 'custom',
        }),
      });
    });

    it('should restore the reverse initial state on transitioning', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);

      act(() => {
        changePaletteIn(instance, 'negative');
      });

      jest.advanceTimersByTime(250);

      expect(props.setPalette).toHaveBeenCalledWith({
        type: 'palette',
        name: 'negative',
        params: expect.objectContaining({
          name: 'negative',
          reverse: false,
        }),
      });
    });

    it('should rewrite the min/max range values on palette change', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);

      act(() => {
        changePaletteIn(instance, 'custom');
      });

      jest.advanceTimersByTime(250);

      expect(props.setPalette).toHaveBeenCalledWith({
        type: 'palette',
        name: 'custom',
        params: expect.objectContaining({
          rangeMin: 0,
          rangeMax: Number.POSITIVE_INFINITY,
        }),
      });
    });
  });

  describe('percentage / number modes', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'custom' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
        dataBounds: { min: 5, max: 200 },
      };
    });

    it('should switch mode and range boundaries on click', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      act(() => {
        instance
          .find('[data-test-subj="lnsPalettePanel_dynamicColoring_custom_range_groups"]')
          .find(EuiButtonGroup)
          .prop('onChange')!('number');
      });

      jest.advanceTimersByTime(250);

      act(() => {
        instance
          .find('[data-test-subj="lnsPalettePanel_dynamicColoring_custom_range_groups"]')
          .find(EuiButtonGroup)
          .prop('onChange')!('percent');
      });

      jest.advanceTimersByTime(250);

      expect(props.setPalette).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          params: expect.objectContaining({
            rangeType: 'number',
            rangeMin: 5,
            rangeMax: Number.POSITIVE_INFINITY,
          }),
        })
      );

      expect(props.setPalette).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          params: expect.objectContaining({
            rangeType: 'percent',
            rangeMin: 0,
            rangeMax: Number.POSITIVE_INFINITY,
          }),
        })
      );
    });

    it('should not render the switch disabled from props', () => {
      const instance = mountWithIntl(
        <CustomizablePalette {...props} showRangeTypeSelector={false} />
      );
      expect(
        instance
          .find('[data-test-subj="lnsPalettePanel_dynamicColoring_custom_range_groups"]')
          .exists()
      ).toBe(false);
    });
  });

  describe('custom stops', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'positive' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
        dataBounds: { min: 0, max: 100 },
      };
    });
    it('should be visible for predefined palettes', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      expect(
        instance
          .find('[data-test-subj="lnsPalettePanel_dynamicColoring_custom_color_ranges"]')
          .exists()
      ).toEqual(true);
    });

    it('should be visible for custom palettes', () => {
      const instance = mountWithIntl(
        <CustomizablePalette
          {...props}
          activePalette={{
            type: 'palette',
            name: 'custom',
            params: {
              name: 'custom',
            },
          }}
        />
      );
      expect(
        instance
          .find('[data-test-subj="lnsPalettePanel_dynamicColoring_custom_color_ranges"]')
          .exists()
      ).toEqual(true);
    });
  });
});
