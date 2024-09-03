/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogDocument } from '@kbn/discover-utils/src';
import type {
  UnifiedDataTableProps,
  RowControlComponent,
  RowControlRowProps,
} from '@kbn/unified-data-table';
import {
  actionsHeaderAriaLabelDegradedAction,
  actionsHeaderAriaLabelStacktraceAction,
  degradedDocButtonLabelWhenNotPresent,
  degradedDocButtonLabelWhenPresent,
  stacktraceAvailableControlButton,
  stacktraceNotAvailableControlButton,
} from '../components/common/translations';
import * as constants from '../../common/constants';
import { getStacktraceFields } from '../utils/get_stack_trace';

const DegradedDocs = ({
  Control,
  rowProps: { record },
}: {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
}) => {
  const isDegradedDocumentExists = constants.DEGRADED_DOCS_FIELD in record.raw;

  return isDegradedDocumentExists ? (
    <Control
      data-test-subj="docTableDegradedDocExist"
      color="danger"
      label={degradedDocButtonLabelWhenPresent}
      iconType="indexClose"
      onClick={undefined}
    />
  ) : (
    <Control
      data-test-subj="docTableDegradedDocDoesNotExist"
      color="text"
      label={degradedDocButtonLabelWhenNotPresent}
      iconType="indexClose"
      onClick={undefined}
    />
  );
};

const Stacktrace = ({
  Control,
  rowProps: { record },
}: {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
}) => {
  const stacktrace = getStacktraceFields(record as LogDocument);
  const hasValue = Object.values(stacktrace).some((value) => value);

  return hasValue ? (
    <Control
      data-test-subj="docTableStacktraceExist"
      label={stacktraceAvailableControlButton}
      iconType="apmTrace"
      onClick={undefined}
    />
  ) : (
    <Control
      disabled
      data-test-subj="docTableStacktraceDoesNotExist"
      label={stacktraceNotAvailableControlButton}
      iconType="apmTrace"
      onClick={undefined}
    />
  );
};

export const getRowAdditionalControlColumns =
  (): UnifiedDataTableProps['rowAdditionalLeadingControls'] => {
    return [
      {
        id: 'connectedDegradedDocs',
        headerAriaLabel: actionsHeaderAriaLabelDegradedAction,
        renderControl: (Control, rowProps) => {
          return <DegradedDocs Control={Control} rowProps={rowProps} />;
        },
      },
      {
        id: 'connectedStacktraceDocs',
        headerAriaLabel: actionsHeaderAriaLabelStacktraceAction,
        renderControl: (Control, rowProps) => {
          return <Stacktrace Control={Control} rowProps={rowProps} />;
        },
      },
    ];
  };
