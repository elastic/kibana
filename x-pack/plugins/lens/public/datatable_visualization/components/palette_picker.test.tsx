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
import { applyPaletteParams, CustomizablePalette, defaultParams } from './palette_picker';
import { CustomPaletteParams } from '../expression';
import { ReactWrapper } from 'enzyme';

describe('palette utilities', () => {
  const paletteRegistry = chartPluginMock.createPaletteRegistry();
  describe('applyPaletteParams', () => {
    it('should return empty params for no palette', () => {
      expect(applyPaletteParams(paletteRegistry)).toEqual({});
    });

    it('should return a set of colors for a basic configuration', () => {
      expect(applyPaletteParams(paletteRegistry, { type: 'palette', name: 'positive' })).toEqual({
        colorStops: [
          { color: 'blue', stop: 0 },
          { color: 'yellow', stop: 1 },
        ],
        mode: 'fixed',
      });
    });

    it('should preserve gradient configuration', () => {
      expect(
        applyPaletteParams(paletteRegistry, {
          type: 'palette',
          name: 'positive',
          params: { progression: 'gradient' },
        })
      ).toEqual({
        colorStops: [
          { color: 'blue', stop: 0 },
          { color: 'yellow', stop: 1 },
        ],
        mode: 'gradient',
      });
    });

    it('should reverse the palette color stops correctly', () => {
      expect(
        applyPaletteParams(paletteRegistry, {
          type: 'palette',
          name: 'positive',
          params: { reverse: true },
        })
      ).toEqual({
        colorStops: [
          { color: 'yellow', stop: 0 },
          { color: 'blue', stop: 1 },
        ],
        mode: 'fixed',
      });
    });

    it('should preserve existing custom stops if matching with the number of steps', () => {
      expect(
        applyPaletteParams(paletteRegistry, {
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
        })
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
        applyPaletteParams(paletteRegistry, {
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
        })
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
        applyPaletteParams(paletteRegistry, {
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
        })
      ).toEqual({
        colorStops: [
          { color: 'blue', stop: 0 },
          { color: 'yellow', stop: 1 },
        ],
        mode: 'fixed',
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
  };

  describe('palette picker', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'positive' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
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

    it('should reset steps and progression going from custom to predefined palette', () => {
      const instance = mountWithIntl(
        <CustomizablePalette
          {...props}
          activePalette={{
            type: 'palette',
            name: 'custom',
            params: { name: 'custom', steps: 3, progression: 'stepped' },
          }}
        />
      );

      // now change to a predefined palette
      changePaletteIn(instance, 'positive');

      expect(props.setPalette).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            steps: defaultParams.steps,
            progression: 'fixed',
          }),
        })
      );
    });
  });

  describe('range definition', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'positive' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
      };
    });

    function toggleAutoRange(instance: ReactWrapper, checked: boolean) {
      return ((instance
        .find('[data-test-subj="lnsDatatable_dynamicColoring_auto_range"]')
        .first()
        .prop('onChange') as unknown) as (event: EuiSwitchEvent) => void)({
        target: { checked },
      } as EuiSwitchEvent);
    }

    it('should start with auto range', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_auto_range"]')
          .first()
          .prop('checked')
      ).toEqual(true);
    });

    it('should not show any min/max range inputs when in auto', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      expect(
        instance.find('[data-test-subj="lnsDatatable_dynamicColoring_max_range"]').exists()
      ).toBe(false);
    });

    it('should change to numeric range when switching off auto', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);

      toggleAutoRange(instance, false);
      expect(props.setPalette).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            rangeType: 'number',
          }),
        })
      );
    });

    it('should clear min and max ranges when enabling auto range', () => {
      const instance = mountWithIntl(
        <CustomizablePalette
          {...props}
          activePalette={{
            ...props.activePalette,
            params: { rangeType: 'number', rangeMax: 100, rangeMin: 0 },
          }}
        />
      );

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_custom_range_groups"]')
          .first()
          .prop('idSelected')
      ).toEqual(expect.stringContaining('number'));

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_min_range"]')
          .first()
          .prop('value')
      ).toEqual('0');

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_max_range"]')
          .first()
          .prop('value')
      ).toEqual('100');

      toggleAutoRange(instance, true);

      expect(props.setPalette).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            rangeType: 'auto',
            rangeMax: undefined,
            rangeMin: undefined,
          }),
        })
      );
    });

    it('should fallback to default min/max values if none are set from saved palette config', () => {
      const instance = mountWithIntl(
        <CustomizablePalette
          {...props}
          activePalette={{
            ...props.activePalette,
            params: { rangeType: 'number' },
          }}
        />
      );
      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_custom_range_groups"]')
          .first()
          .prop('idSelected')
      ).toEqual(expect.stringContaining('number'));

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_min_range"]')
          .first()
          .prop('value')
      ).toEqual('' + defaultParams.rangeMin);

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_max_range"]')
          .first()
          .prop('value')
      ).toEqual('' + defaultParams.rangeMax);
    });

    it('should highlight and show an error message if range is invalid', () => {
      const instance = mountWithIntl(
        <CustomizablePalette
          {...props}
          activePalette={{
            ...props.activePalette,
            params: { rangeType: 'number', rangeMin: 100, rangeMax: 0 },
          }}
        />
      );

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_min_range"]')
          .first()
          .prop('isInvalid')
      ).toEqual(true);

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_min_range_label"]')
          .first()
          .prop('error')
      ).toEqual('Min cannot be higher than max');

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_max_range"]')
          .first()
          .prop('isInvalid')
      ).toEqual(true);

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_max_range_label"]')
          .first()
          .prop('error')
      ).toEqual('Max cannot be lower than min');
    });

    it('should show a percentage append when in percent range mode', () => {
      const instance = mountWithIntl(
        <CustomizablePalette
          {...props}
          activePalette={{
            ...props.activePalette,
            params: { rangeType: 'percent', rangeMin: 100, rangeMax: 0 },
          }}
        />
      );
      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_custom_range_groups"]')
          .first()
          .prop('idSelected')
      ).toEqual(expect.stringContaining('percent'));

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_min_range"]')
          .first()
          .prop('append')
      ).toEqual('%');

      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_max_range"]')
          .first()
          .prop('append')
      ).toEqual('%');
    });
  });

  describe('progression option', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'positive' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
      };
    });

    it('should show only 2 options for predefined palettes', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_progression_groups"]')
          .first()
          .prop('options')
      ).toHaveLength(2);
    });

    it('should start with the fixed option selected', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_progression_groups"]')
          .first()
          .prop('idSelected')
      ).toEqual(expect.stringContaining('fixed'));
    });

    it('should show a steps range input for predefined palette', () => {
      const instance = mountWithIntl(<CustomizablePalette {...props} />);
      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_progression_steps"]')
          .first()
          .prop('value')
      ).toEqual(defaultParams.steps);
    });

    it('should load the saved steps state of the palette', () => {
      const instance = mountWithIntl(
        <CustomizablePalette
          {...props}
          activePalette={{ type: 'palette', name: 'positive', params: { steps: 4 } }}
        />
      );
      expect(
        instance
          .find('[data-test-subj="lnsDatatable_dynamicColoring_progression_steps"]')
          .first()
          .prop('value')
      ).toEqual(4);
    });

    it('should not show the steps range input for custom palette', () => {
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
        instance.find('[data-test-subj="lnsDatatable_dynamicColoring_progression_steps"]').exists()
      ).toEqual(false);
    });

    it('should show only 3 options for custom palettes', () => {
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
          .find('[data-test-subj="lnsDatatable_dynamicColoring_progression_groups"]')
          .first()
          .prop('options')
      ).toHaveLength(3);
    });
  });

  describe('reverse option', () => {
    beforeEach(() => {
      props = {
        activePalette: { type: 'palette', name: 'positive' },
        palettes: paletteRegistry,
        setPalette: jest.fn(),
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
