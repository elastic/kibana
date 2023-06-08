/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFetchSloDetails } from '../../../../public/hooks/slo/use_fetch_slo_details';
import { useFetchSloList } from '../../../../public/hooks/slo/use_fetch_slo_list';
import { CreateCompositeSLOForm } from '../helpers/process_form_values';

interface Props {
  index: number;
  isDeleteDisabled: boolean;
  onDeleteSource: () => void;
}

export function SourceRow({ index, isDeleteDisabled, onDeleteSource }: Props) {
  const { control, getFieldState, watch, setValue } = useFormContext<CreateCompositeSLOForm>();

  const [searchValue, setSearchValue] = useState<string>('');
  const onSearchChange = useMemo(() => debounce((value: string) => setSearchValue(value), 300), []);
  const { isLoading: isSloListLoading, sloList } = useFetchSloList({ name: searchValue });
  const options =
    !isSloListLoading && !!sloList?.results
      ? sloList.results.map((slo) => ({ value: slo.id, label: slo.name }))
      : [];

  const selectedSourceId = watch(`sources.${index}.id`);
  const { slo: selectedSourceSlo, isLoading: isSelectedSourceSloLoading } = useFetchSloDetails({
    sloId: !!selectedSourceId ? selectedSourceId : undefined,
  });

  useEffect(() => {
    if (selectedSourceId !== '' && !!selectedSourceSlo) {
      setValue(`sources.${index}.revision`, selectedSourceSlo.revision);
      setValue(`sources.${index}._data`, selectedSourceSlo);
    }
    if (selectedSourceId === '') {
      setValue(`sources.${index}._data`, undefined);
    }
  }, [selectedSourceSlo, selectedSourceId, setValue]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={4}>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.observability.slo.compositeSloForm.sourceSlo.label', {
            defaultMessage: 'SLO',
          })}
          isInvalid={getFieldState(`sources.${index}.id`).invalid}
        >
          <Controller
            name={`sources.${index}.id`}
            shouldUnregister
            defaultValue=""
            rules={{ required: true }}
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiComboBox
                {...field}
                async
                fullWidth
                singleSelection={{ asPlainText: true }}
                placeholder={i18n.translate(
                  'xpack.observability.slo.compositeSloForm.sourceSloField.placeholder',
                  { defaultMessage: 'Select a source SLO' }
                )}
                aria-label={i18n.translate(
                  'xpack.observability.slo.compositeSloForm.sourceSloField.placeholder',
                  { defaultMessage: 'Select a source SLO' }
                )}
                isInvalid={fieldState.invalid}
                isLoading={isSloListLoading || (!!selectedSourceId && isSelectedSourceSloLoading)}
                onChange={(selected: EuiComboBoxOptionOption[]) => {
                  if (selected.length) {
                    return field.onChange(selected[0].value);
                  }

                  field.onChange('');
                }}
                selectedOptions={
                  !!field.value && !isSelectedSourceSloLoading && !!selectedSourceSlo
                    ? [
                        {
                          value: selectedSourceSlo.id,
                          label: selectedSourceSlo.name,
                        },
                      ]
                    : []
                }
                options={options}
                onSearchChange={onSearchChange}
              />
            )}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.observability.slo.compositeSloForm.sourceWeight.label', {
            defaultMessage: 'Weight',
          })}
          isInvalid={getFieldState(`sources.${index}.weight`).invalid}
        >
          <Controller
            name={`sources.${index}.weight`}
            shouldUnregister
            defaultValue={1}
            rules={{
              required: true,
              min: 1,
              max: 999,
            }}
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiFieldNumber
                {...field}
                required
                isInvalid={fieldState.invalid}
                value={String(field.value)}
                min={1}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            onClick={onDeleteSource}
            disabled={isDeleteDisabled}
            title={i18n.translate('xpack.observability.slo.compositeSloForm.source.deleteLabel', {
              defaultMessage: 'Delete source SLO',
            })}
            aria-label={i18n.translate(
              'xpack.observability.slo.compositeSloForm.source.deleteLabel',
              { defaultMessage: 'Delete source SLO' }
            )}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
