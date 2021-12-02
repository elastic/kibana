/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldText,
  EuiColorPicker,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiSpacer,
  htmlIdGenerator,
} from '@elastic/eui';
import type { IFieldFormat } from 'src/plugins/field_formats/common';
import type { PaletteOutput } from 'src/plugins/charts/public';
import { isValidColor } from './utils';
import { TooltipWrapper, useDebouncedValue } from '../index';
import type { CustomPaletteParamsConfig, ColorTerm, CustomPaletteParams } from '../../../common';
import { SavePaletteModal } from './save_palette_modal';

const idGeneratorFn = htmlIdGenerator();
function areColorsValid(colorTerms: Array<{ color: string; term: string }>) {
  return colorTerms.every(({ color }) => isValidColor(color));
}

export interface ColorTermsProps {
  colorTerms: ColorTerm[];
  libraryPalettes?: Array<PaletteOutput<CustomPaletteParams>>;
  onChange: (colorTerms: ColorTerm[]) => void;
  savePalette: (title: string) => Promise<void>;
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  'data-test-prefix': string;
  fieldFormatter?: IFieldFormat;
  enableSave: boolean;
}
export const ColorTerms = ({
  libraryPalettes,
  onChange,
  paletteConfiguration,
  savePalette,
  colorTerms,
  ['data-test-prefix']: dataTestPrefix,
  fieldFormatter,
  enableSave,
}: ColorTermsProps) => {
  const [isSavePaletteModalOpen, setSavePaletteModalOpen] = useState(false);
  const [shouldDisableSave, setShouldDisableSave] = useState(true);

  const onChangeWithValidation = useCallback(
    (newColorTerms: Array<{ color: string; term: string }>) => {
      if (areColorsValid(newColorTerms)) {
        onChange(newColorTerms);
      }
    },
    [onChange]
  );

  const memoizedValues = useMemo(() => {
    return colorTerms.map(({ color, term }, i) => ({
      color,
      term,
      id: idGeneratorFn(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteConfiguration?.name, paletteConfiguration?.reverse]);

  const { inputValue: localColorTerms, handleInputChange: setLocalColorTerms } = useDebouncedValue({
    onChange: onChangeWithValidation,
    value: memoizedValues,
  });

  const onPaletteSave = useCallback(
    (title: string) => {
      return savePalette(title).then(() => {
        setSavePaletteModalOpen(false);
        setShouldDisableSave(true);
      });
    },
    [savePalette, setShouldDisableSave]
  );

  useEffect(() => {
    if (paletteConfiguration?.name !== 'custom') {
      setShouldDisableSave(true);
    }
  }, [paletteConfiguration]);

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`${dataTestPrefix}_dynamicColoring_color_terms`}
        direction="column"
        gutterSize="s"
      >
        {localColorTerms.map(({ color, term, id }, index) => {
          return (
            <EuiFlexItem
              key={id}
              data-test-subj={`${dataTestPrefix}_dynamicColoring_term_row_${index}`}
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    disabled
                    data-test-subj={`${dataTestPrefix}_dynamicColoring_term_value_${index}`}
                    value={fieldFormatter?.convert(term) ?? term}
                    aria-label={i18n.translate(
                      'xpack.lens.dynamicColoring.customPalette.termAriaLabel',
                      {
                        defaultMessage: 'Term {index}',
                        values: {
                          index: index + 1,
                        },
                      }
                    )}
                  />
                </EuiFlexItem>

                <EuiFlexItem
                  data-test-subj={`${dataTestPrefix}_dynamicColoring_term_color_${index}`}
                >
                  <EuiColorPicker
                    key={term}
                    onChange={(newColor) => {
                      const newColorTerms = [...localColorTerms];
                      newColorTerms[index] = { color: newColor, term, id };
                      setLocalColorTerms(newColorTerms);
                      setShouldDisableSave(false);
                    }}
                    secondaryInputDisplay="top"
                    color={color}
                    isInvalid={!isValidColor(color)}
                    showAlpha
                    compressed
                    placeholder=" "
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      {enableSave && (
        <TooltipWrapper
          tooltipContent={i18n.translate('xpack.lens.dynamicColoring.customPalette.noChangesMade', {
            defaultMessage: `You haven't applied any changes`,
          })}
          condition={shouldDisableSave}
          position="top"
          delay="regular"
        >
          <EuiButtonEmpty
            data-test-subj={`${dataTestPrefix}_dynamicColoring_savePalette`}
            iconType="save"
            color="primary"
            aria-label={i18n.translate('xpack.lens.dynamicColoring.customPalette.save', {
              defaultMessage: 'Save palette',
            })}
            size="xs"
            isDisabled={shouldDisableSave}
            flush="left"
            onClick={() => {
              setSavePaletteModalOpen(true);
            }}
          >
            {i18n.translate('xpack.lens.dynamicColoring.customPalette.save', {
              defaultMessage: 'Save palette',
            })}
          </EuiButtonEmpty>
        </TooltipWrapper>
      )}
      {isSavePaletteModalOpen && enableSave && (
        <SavePaletteModal
          onCancel={() => setSavePaletteModalOpen(false)}
          onSave={onPaletteSave}
          paletteName={paletteConfiguration?.title ?? ''}
          libraryPalettes={libraryPalettes}
        />
      )}
    </>
  );
};
