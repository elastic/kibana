/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { ReactWrapper } from 'enzyme';
import { CustomPaletteParams } from './types';
import { applyPaletteParams } from './utils';
import { CustomizablePalette } from './palette_configuration';

describe('palette utilities', () => {
  const paletteRegistry = chartPluginMock.createPaletteRegistry();
  describe('applyPaletteParams', () => {
    it('should return a set of colors for a basic configuration', () => {
      expect(
        applyPaletteParams(
          paletteRegistry,
          { type: 'palette', name: 'positive' },
          { min: 0, max: 100 }
        )
      ).toEqual([
        { color: 'blue', stop: 20 },
        { color: 'yellow', stop: 70 },
      ]);
    });

    it('should reverse the palette color stops correctly', () => {
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'positive',
            params: { reverse: true },
          },
          { min: 0, max: 100 }
        )
      ).toEqual([
        { color: 'yellow', stop: 20 },
        { color: 'blue', stop: 70 },
      ]);
    });
  });
});

describe('palette panel', () => {
  const paletteRegistry = chartPluginMock.createPaletteRegistry();
  let props: {
    palettes: PaletteRegistry;
    activePalette: PaletteOutput<CustomPaletteParams>;
    setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
    dataBounds: { min: number; max: number };
  };

  describe('palette picker', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'positive' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
        dataBounds: { min: 0, max: 100 },
      };
    });

    function changePaletteIn(instance: ReactWrapper, newPaletteName: string) {
      return ((instance
        .find('[data-test-subj="lnsDatatable_dynamicColoring_palette_picker"]')
        .at(1)
        .prop('onChange') as unknown) as (value: string) => void)?.(newPaletteName);
    }

    it('should show only dynamic coloring enabled palette + custom option', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      const paletteOptions = instance
        .find('[data-test-subj="lnsDatatable_dynamicColoring_palette_picker"]')
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

      changePaletteIn(instance, 'custom');

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

    describe('reverse option', () => {
      beforeEach(() => {
        props = {
          activePalette: { type: 'palette', name: 'positive' },
          palettes: paletteRegistry,
          setPalette: jest.fn(),
          dataBounds: { min: 0, max: 100 },
        };
      });

      function toggleReverse(instance: ReactWrapper, checked: boolean) {
        return instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_reverse"]')
          .first()
          .prop('onClick')!({} as React.MouseEvent);
      }

      it('should reverse the colorStops on click', () => {
        const instance = mountWithIntl(<CustomizablePalette {...props} />);

        toggleReverse(instance, true);

        expect(props.setPalette).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({
              reverse: true,
            }),
          })
        );
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
          instance.find('[data-test-subj="lnsDatatable_dynamicColoring_custom_stops"]').exists()
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
          instance.find('[data-test-subj="lnsDatatable_dynamicColoring_custom_stops"]').exists()
        ).toEqual(true);
      });
    });
  });
});
