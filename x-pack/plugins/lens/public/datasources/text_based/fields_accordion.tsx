/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';

import {
  EuiText,
  EuiNotificationBadge,
  EuiAccordion,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { FieldButton } from '@kbn/react-field';
import { DragDrop } from '../../drag_drop';
import { LensFieldIcon } from '../../shared_components';
import type { DataType } from '../../types';

export interface FieldsAccordionProps {
  initialIsOpen: boolean;
  hasLoaded: boolean;
  isFiltered: boolean;
  // forceState: 'open' | 'closed';
  id: string;
  label: string;
  fields: DatatableColumn[];
}

export const FieldsAccordion = memo(function InnerFieldsAccordion({
  initialIsOpen,
  hasLoaded,
  isFiltered,
  id,
  label,
  fields,
}: FieldsAccordionProps) {
  const renderButton = useMemo(() => {
    return (
      <EuiText size="xs">
        <strong>{label}</strong>
      </EuiText>
    );
  }, [label]);

  const extraAction = useMemo(() => {
    if (hasLoaded) {
      return (
        <EuiNotificationBadge size="m" color={isFiltered ? 'accent' : 'subdued'}>
          {fields.length}
        </EuiNotificationBadge>
      );
    }

    return <EuiLoadingSpinner size="m" />;
  }, [fields.length, hasLoaded, isFiltered]);

  return (
    <>
      <EuiAccordion
        initialIsOpen={initialIsOpen}
        id={id}
        buttonContent={renderButton}
        extraAction={extraAction}
        data-test-subj={id}
      >
        <ul
          className="lnsInnerIndexPatternDataPanel__fieldItems"
          data-test-subj="lnsTextBasedLanguagesPanelFields"
        >
          {fields.length > 0 &&
            fields.map((field, index) => (
              <li key={field?.name}>
                <DragDrop
                  draggable
                  order={[index]}
                  value={{
                    field: field?.name,
                    id: field.id,
                    humanData: { label: field?.name },
                  }}
                  dataTestSubj={`lnsFieldListPanelField-${field.name}`}
                >
                  <FieldButton
                    className={`lnsFieldItem lnsFieldItem--${field?.meta?.type}`}
                    isActive={false}
                    onClick={() => {}}
                    fieldIcon={<LensFieldIcon type={field?.meta.type as DataType} />}
                    fieldName={field?.name}
                  />
                </DragDrop>
              </li>
            ))}
        </ul>
      </EuiAccordion>
      <EuiSpacer size="m" />
    </>
  );
});
