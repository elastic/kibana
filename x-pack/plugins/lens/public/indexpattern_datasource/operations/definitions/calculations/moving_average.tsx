/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { FormattedIndexPatternColumn, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPatternLayer } from '../../../types';
import {
  buildLabelFunction,
  checkForDateHistogram,
  getErrorsForDateReference,
  dateBasedOperationToExpression,
  hasDateField,
} from './utils';
import { updateColumnParam } from '../../layer_helpers';
import { isValidNumber, useDebounceWithOptions } from '../helpers';
import { adjustTimeScaleOnOtherColumnChange } from '../../time_scale_utils';
import { HelpPopover, HelpPopoverButton } from '../../../help_popover';
import type { OperationDefinition, ParamEditorProps } from '..';

const ofName = buildLabelFunction((name?: string) => {
  return i18n.translate('xpack.lens.indexPattern.movingAverageOf', {
    defaultMessage: 'Moving average of {name}',
    values: {
      name:
        name ??
        i18n.translate('xpack.lens.indexPattern.incompleteOperation', {
          defaultMessage: '(incomplete)',
        }),
    },
  });
});

export type MovingAverageIndexPatternColumn = FormattedIndexPatternColumn &
  ReferenceBasedIndexPatternColumn & {
    operationType: 'moving_average';
    params: {
      window: number;
    };
  };

export const movingAverageOperation: OperationDefinition<
  MovingAverageIndexPatternColumn,
  'fullReference'
> = {
  type: 'moving_average',
  priority: 1,
  displayName: i18n.translate('xpack.lens.indexPattern.movingAverage', {
    defaultMessage: 'Moving average',
  }),
  input: 'fullReference',
  selectionStyle: 'full',
  requiredReferences: [
    {
      input: ['field'],
      validateMetadata: (meta) => meta.dataType === 'number' && !meta.isBucketed,
    },
  ],
  getPossibleOperation: (indexPattern) => {
    if (hasDateField(indexPattern)) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  getDefaultLabel: (column, indexPattern, columns) => {
    return ofName(columns[column.references[0]]?.label, column.timeScale);
  },
  toExpression: (layer, columnId) => {
    return dateBasedOperationToExpression(layer, columnId, 'moving_average', {
      window: [(layer.columns[columnId] as MovingAverageIndexPatternColumn).params.window],
    });
  },
  buildColumn: ({ referenceIds, previousColumn, layer }) => {
    const metric = layer.columns[referenceIds[0]];
    return {
      label: ofName(metric?.label, previousColumn?.timeScale),
      dataType: 'number',
      operationType: 'moving_average',
      isBucketed: false,
      scale: 'ratio',
      references: referenceIds,
      timeScale: previousColumn?.timeScale,
      params:
        previousColumn?.dataType === 'number' &&
        previousColumn.params &&
        'format' in previousColumn.params &&
        previousColumn.params.format
          ? { format: previousColumn.params.format, window: 5 }
          : { window: 5 },
    };
  },
  paramEditor: MovingAverageParamEditor,
  isTransferable: (column, newIndexPattern) => {
    return hasDateField(newIndexPattern);
  },
  onOtherColumnChanged: adjustTimeScaleOnOtherColumnChange,
  getErrorMessage: (layer: IndexPatternLayer, columnId: string) => {
    return getErrorsForDateReference(
      layer,
      columnId,
      i18n.translate('xpack.lens.indexPattern.movingAverage', {
        defaultMessage: 'Moving average',
      })
    );
  },
  getHelpMessage: () => <MovingAveragePopup />,
  getDisabledStatus(indexPattern, layer) {
    return checkForDateHistogram(
      layer,
      i18n.translate('xpack.lens.indexPattern.movingAverage', {
        defaultMessage: 'Moving average',
      })
    )?.join(', ');
  },
  timeScalingMode: 'optional',
};

function MovingAverageParamEditor({
  layer,
  updateLayer,
  currentColumn,
  columnId,
}: ParamEditorProps<MovingAverageIndexPatternColumn>) {
  const [inputValue, setInputValue] = useState(String(currentColumn.params.window));

  useDebounceWithOptions(
    () => {
      if (!isValidNumber(inputValue, true, undefined, 1)) return;
      const inputNumber = parseInt(inputValue, 10);
      updateLayer(
        updateColumnParam({
          layer,
          columnId,
          paramName: 'window',
          value: inputNumber,
        })
      );
    },
    { skipFirstRender: true },
    256,
    [inputValue]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.movingAverage.window', {
        defaultMessage: 'Window size',
      })}
      display="columnCompressed"
      fullWidth
      isInvalid={!isValidNumber(inputValue)}
    >
      <EuiFieldNumber
        compressed
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
        min={1}
        step={1}
        isInvalid={!isValidNumber(inputValue)}
      />
    </EuiFormRow>
  );
}

const MovingAveragePopup = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <HelpPopover
      anchorPosition="upCenter"
      button={
        <HelpPopoverButton onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
          {i18n.translate('xpack.lens.indexPattern.movingAverage.helpText', {
            defaultMessage: 'How it works',
          })}
        </HelpPopoverButton>
      }
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
      title={i18n.translate('xpack.lens.indexPattern.movingAverage.titleHelp', {
        defaultMessage: 'How moving average works',
      })}
    >
      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.movingAverage.basicExplanation"
          defaultMessage="Moving average slides a window across the data and displays the average value. Moving average is supported for date histograms only."
        />
      </p>

      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.movingAverage.longerExplanation"
          defaultMessage="To calculate the moving average, Lens uses the mean of the window and applies a skip policy for gaps.  For missing values, the bucket is skipped, and the calculation is performed on the next value."
        />
      </p>

      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.movingAverage.tableExplanation"
          defaultMessage="For example, given the data [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], you can calculate a simple moving average with a window size of 5:"
        />
      </p>

      <ul>
        <li>(1 + 2 + 3 + 4 + 5) / 5 = 3</li>
        <li>(2 + 3 + 4 + 5 + 6) / 5 = 4</li>
        <li>...</li>
        <li>(5 + 6 + 7 + 8 + 9) / 5 = 7</li>
      </ul>

      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.movingAverage.windowLimitations"
          defaultMessage="The window does not include the current value."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.movingAverage.windowInitialPartial"
          defaultMessage="The window is partial until it reaches the requested number of items.  For example, with a window size of 5:"
        />
      </p>
      <ul>
        <li>(1 + 2) / 2 = 1.5</li>
        <li>(1 + 2 + 3) / 3 = 2</li>
        <li>(1 + 2 + 3 + 4) / 4 = 2.5</li>
        <li>(1 + 2 + 3 + 4 + 5) / 5 = 3</li>
      </ul>

      <p>
        <FormattedMessage
          id="xpack.lens.indexPattern.movingAverage.limitations"
          defaultMessage="The first moving average value starts at the second item."
        />
      </p>
    </HelpPopover>
  );
};
