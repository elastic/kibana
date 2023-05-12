/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a react functional component called FieldsTable

import React, { FC, useState, useEffect } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
import { FindFileStructureResponse, InputOverrides } from '@kbn/file-upload-plugin/common';
import { i18n } from '@kbn/i18n';
import { FieldTypeIcon } from './field_type_icon';
import { SupportedFieldType } from './analysis_markup/common/job_field_type';
import {
  removeFieldInGrokPattern,
  replaceFieldInGrokPatternByName,
} from './analysis_markup/grok_pattern';
import { getSupportedFieldType } from './analysis_markup/get_field_names';

interface FieldsTableProps {
  results: FindFileStructureResponse;
  overrides: InputOverrides;
  runAnalysis(overrides: InputOverrides): Promise<void>;
}

export interface Field {
  type: string;
  name: string;
  originalName: string;
  enabled: boolean;
  hidden: boolean;
}

export const FieldsTable: FC<FieldsTableProps> = ({ results, overrides, runAnalysis }) => {
  const [fields, setFields] = useState<Field[]>([]);

  useEffect(() => {
    const tempFields = Object.entries(results.mappings.properties).map(([name, field]) => {
      const hidden = name === '@timestamp' || name === 'message';
      return {
        name,
        originalName: name,
        type: field.type,
        enabled: true,
        hidden,
      };
    });
    setFields(tempFields);
  }, [results]);

  const onChange = (name: string, originalName: string) => {
    const field = fields.find((f) => f.originalName === originalName);
    if (field) {
      field.name = name;
    }
    setFields([...fields]);
  };

  const onDelete = (originalName: string) => {
    const field = fields.find((f) => f.originalName === originalName);
    if (field) {
      field.enabled = false;
    }
    setFields([...fields]);
  };

  const onUpdate = () => {
    const grokPattern = createGrokPatternFromFields(fields, results, overrides);
    runAnalysis({ grok_pattern: grokPattern });
  };

  const columns: Array<EuiBasicTableColumn<Field>> = [
    {
      field: 'type',
      name: 'Type',
      render: (fieldType: SupportedFieldType, item: Field) => {
        return <FieldTypeIcon type={getSupportedFieldType(fieldType)} tooltipEnabled={true} />;
      },
    },
    {
      name: 'Name',
      render: (field: Field) => {
        return (
          <EuiFieldText
            compressed={true}
            value={field.name}
            onChange={(e) => onChange(e.target.value, field.originalName)}
          />
        );
      },
    },
    {
      name: '',
      actions: [
        {
          render: (field: Field) => {
            return (
              <EuiButtonIcon
                size="xs"
                aria-label={i18n.translate('xpack.ml.jobMessages.toggleInChartAriaLabel', {
                  defaultMessage: 'Delete',
                })}
                iconType="trash"
                color="danger"
                onClick={() => onDelete(field.originalName)}
              />
            );
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiBasicTable
        items={fields.filter((f) => f.enabled && !f.hidden)}
        rowHeader="firstName"
        columns={columns}
        // rowProps={getRowProps}
        // cellProps={getCellProps}
      />

      <EuiSpacer size="m" />

      <EuiButton
        onClick={() => onUpdate()}
        disabled={!fields.some((f) => f.name !== f.originalName || f.enabled === false)}
      >
        Update
      </EuiButton>
    </>
  );
};

function createGrokPatternFromFields(
  fields: Field[],
  results: FindFileStructureResponse,
  overrides: InputOverrides
) {
  const grokPattern = results.grok_pattern!;
  let newGrokPattern = results.grok_pattern!;
  fields.forEach((field, i) => {
    if (field.name !== field.originalName && field.enabled) {
      newGrokPattern = replaceFieldInGrokPatternByName(grokPattern, field.name, field.originalName);
    }
  });

  fields.forEach((field, i) => {
    if (field.enabled === false && field.hidden === false) {
      newGrokPattern = removeFieldInGrokPattern(newGrokPattern, field.originalName);
    }
  });

  return newGrokPattern;
}
