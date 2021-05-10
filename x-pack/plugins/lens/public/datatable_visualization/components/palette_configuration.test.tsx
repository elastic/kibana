/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiColorPalettePickerPaletteProps, EuiSwitchEvent } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { applyPaletteParams, CustomizablePalette } from './palette_configuration';
import { CustomPaletteParams } from '../expression';
import { ReactWrapper } from 'enzyme';

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
      ).toEqual({
        colorStops: [
          { color: 'blue', stop: 0 },
          { color: 'yellow', stop: 10 },
        ],
        mode: 'fixed',
      });
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
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 0 },
          { color: 'blue', stop: 10 }, // default steps is set to 10
        ],
        mode: 'fixed',
      });
    });

    it('should preserve existing custom stops if matching with the number of steps', () => {
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'positive',
            params: {
              steps: 3,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 0.5 },
                { color: 'green', stop: 1 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 0 },
          { color: 'red', stop: 0.5 },
          { color: 'green', stop: 1 },
        ],
        mode: 'fixed',
      });
    });

    it('should preserve existing custom stops if matching with the number of steps, but reversed', () => {
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'positive',
            params: {
              reverse: true,
              steps: 3,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 0.5 },
                { color: 'green', stop: 1 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        colorStops: [
          { color: 'green', stop: 0 },
          { color: 'red', stop: 0.5 },
          { color: 'yellow', stop: 1 },
        ],
        mode: 'fixed',
      });
    });

    it('should regenerate color stops if mismatch with steps value', () => {
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'positive',
            params: {
              steps: 2,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 0.5 },
                { color: 'green', stop: 1 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        // color change here is dictated from paletteRegistryMock
        colorStops: [
          { color: 'blue', stop: 0 },
          { color: 'yellow', stop: 100 / 3 }, // side effect of palette mock, as preconfigured palette is usually made of 10 colors
        ],
        mode: 'fixed',
      });
    });

    it('should shift color stops only for custom palettes is in fixed mode', () => {
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'custom',
            params: {
              name: 'custom',
              progression: 'fixed',
              steps: 3,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 50 },
                { color: 'green', stop: 100 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 50 },
          { color: 'red', stop: 100 },
        ],
        mode: 'fixed',
      });
      // keep it the same
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'custom',
            params: {
              name: 'custom',
              steps: 3,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 50 },
                { color: 'green', stop: 100 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 0 },
          { color: 'red', stop: 50 },
          { color: 'green', stop: 100 },
        ],
        mode: 'gradient',
      });
      // same
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'positive',
            params: {
              name: 'positive',
              progression: 'fixed',
              steps: 3,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 50 },
                { color: 'green', stop: 100 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 0 },
          { color: 'red', stop: 50 },
          { color: 'green', stop: 100 },
        ],
        mode: 'fixed',
      });
    });
    it('should shift color stops and set last stop at 100 if the last one is not lower than that, only for display', () => {
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'custom',
            params: {
              name: 'custom',
              progression: 'fixed',
              steps: 3,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 50 },
                { color: 'green', stop: 90 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 50 },
          { color: 'red', stop: 90 },
          { color: 'green', stop: 100 },
        ],
        mode: 'fixed',
      });
      // same
      expect(
        applyPaletteParams(
          paletteRegistry,
          {
            type: 'palette',
            name: 'custom',
            params: {
              name: 'custom',
              steps: 3,
              stops: [
                { color: 'yellow', stop: 0 },
                { color: 'red', stop: 50 },
                { color: 'green', stop: 90 },
              ],
            },
          },
          { min: 0, max: 100 }
        )
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 0 },
          { color: 'red', stop: 50 },
          { color: 'green', stop: 90 },
        ],
        mode: 'gradient',
      });
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
        .find('[data-test-subj="lns-palettePicker"]')
        .first()
        .prop('onChange') as unknown) as (value: string) => void)?.(newPaletteName);
    }

    it('should show only dynamic coloring enabled palette + custom option', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      const paletteOptions = instance
        .find('[data-test-subj="lns-palettePicker"]')
        .first()
        .prop('palettes') as EuiColorPalettePickerPaletteProps[];
      expect(paletteOptions.length).toEqual(2);

      expect(paletteOptions[paletteOptions.length - 1]).toEqual({
        title: 'Custom Mocked Palette', // <- picks the title of the custom palette
        type: 'text',
        value: 'custom',
      });
    });

    it('should set the number of steps to 3 when selecting a custom palette', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);

      changePaletteIn(instance, 'custom');

      expect(props.setPalette).toHaveBeenCalledWith({
        type: 'palette',
        name: 'custom',
        params: expect.objectContaining({
          steps: 3,
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
        return ((instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_reverse"]')
          .first()
          .prop('onChange') as unknown) as (event: EuiSwitchEvent) => void)({
          target: { checked },
        } as EuiSwitchEvent);
      }

      it('should start set to false', () => {
        const instance = mountWithIntl(<CustomizablePalette {...props} />);
        expect(
          instance
            .find('[data-test-subj="lnsDatatable_dynamicColoring_reverse"]')
            .first()
            .prop('checked')
        ).toEqual(false);
      });

      it('should set the reverse flag on the state', () => {
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
      it('should be hidden for predefined palettes', () => {
        const instance = mountWithIntl(<CustomizablePalette {...props} />);
        expect(
          instance
            .find('[data-test-subj="lnsDatatable_dynamicColoring_progression_custom_stops"]')
            .exists()
        ).toEqual(false);
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
            .find('[data-test-subj="lnsDatatable_dynamicColoring_progression_custom_stops"]')
            .exists()
        ).toEqual(true);
      });
    });
  });
});
