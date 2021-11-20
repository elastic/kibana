/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { MultiSelectPicker } from '../multi_select_picker';
import type {
  FileBasedFieldVisConfig,
  FileBasedUnknownFieldVisConfig,
} from '../../../../../common/types/field_vis_config';

interface Props {
  fields: Array<FileBasedFieldVisConfig | FileBasedUnknownFieldVisConfig>;
  setVisibleFieldNames(q: string[]): void;
  visibleFieldNames: string[];
}

export const DataVisualizerFieldNamesFilter: FC<Props> = ({
  fields,
  setVisibleFieldNames,
  visibleFieldNames,
}) => {
  const fieldNameTitle = useMemo(
    () =>
      i18n.translate('xpack.dataVisualizer.fieldNameSelect', {
        defaultMessage: 'Field name',
      }),
    []
  );
  const options = useMemo(
    () => fields.filter((d) => d.fieldName !== undefined).map((d) => ({ value: d.fieldName! })),
    [fields]
  );

  return (
    <MultiSelectPicker
      title={fieldNameTitle}
      options={options}
      onChange={setVisibleFieldNames}
      checkedOptions={visibleFieldNames}
      dataTestSubj={'dataVisualizerFieldNameSelect'}
    />
  );
};
