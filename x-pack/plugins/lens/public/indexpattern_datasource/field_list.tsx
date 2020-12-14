/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './field_list.scss';
import { throttle } from 'lodash';
import React, { useState, Fragment, useCallback, useMemo, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FieldItem } from './field_item';
import { NoFieldsCallout } from './no_fields_callout';
import { IndexPatternField } from './types';
import { FieldItemSharedProps, FieldsAccordion } from './fields_accordion';
const PAGINATION_SIZE = 50;

export type FieldGroups = Record<
  string,
  {
    fields: IndexPatternField[];
    fieldCount: number;
    showInAccordion: boolean;
    isInitiallyOpen: boolean;
    title: string;
    isAffectedByGlobalFilter: boolean;
    isAffectedByTimeFilter: boolean;
    hideDetails?: boolean;
    defaultNoFieldsMessage?: string;
  }
>;

function getDisplayedFieldsLength(
  fieldGroups: FieldGroups,
  accordionState: Partial<Record<string, boolean>>
) {
  return Object.entries(fieldGroups)
    .filter(([key]) => accordionState[key])
    .reduce((allFieldCount, [, { fields }]) => allFieldCount + fields.length, 0);
}

export function FieldList({
  exists,
  fieldGroups,
  existenceFetchFailed,
  fieldProps,
  hasSyncedExistingFields,
  filter,
  currentIndexPatternId,
  existFieldsInIndex,
}: {
  exists: (field: IndexPatternField) => boolean;
  fieldGroups: FieldGroups;
  fieldProps: FieldItemSharedProps;
  hasSyncedExistingFields: boolean;
  existenceFetchFailed?: boolean;
  filter: {
    nameFilter: string;
    typeFilter: string[];
  };
  currentIndexPatternId: string;
  existFieldsInIndex: boolean;
}) {
  const [pageSize, setPageSize] = useState(PAGINATION_SIZE);
  const [scrollContainer, setScrollContainer] = useState<Element | undefined>(undefined);
  const [accordionState, setAccordionState] = useState<Partial<Record<string, boolean>>>(() =>
    Object.fromEntries(
      Object.entries(fieldGroups)
        .filter(([, { showInAccordion }]) => showInAccordion)
        .map(([key, { isInitiallyOpen }]) => [key, isInitiallyOpen])
    )
  );

  useEffect(() => {
    // Reset the scroll if we have made material changes to the field list
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
      setPageSize(PAGINATION_SIZE);
    }
  }, [filter.nameFilter, filter.typeFilter, currentIndexPatternId, scrollContainer]);

  const lazyScroll = useCallback(() => {
    if (scrollContainer) {
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >
        scrollContainer.scrollHeight * 0.9;
      if (nearBottom) {
        setPageSize(
          Math.max(
            PAGINATION_SIZE,
            Math.min(
              pageSize + PAGINATION_SIZE * 0.5,
              getDisplayedFieldsLength(fieldGroups, accordionState)
            )
          )
        );
      }
    }
  }, [scrollContainer, pageSize, setPageSize, fieldGroups, accordionState]);

  const paginatedFields = useMemo(() => {
    let remainingItems = pageSize;
    return Object.fromEntries(
      Object.entries(fieldGroups)
        .filter(([, { showInAccordion }]) => showInAccordion)
        .map(([key, fieldGroup]) => {
          if (!accordionState[key] || remainingItems <= 0) {
            return [key, []];
          }
          const slicedFieldList = fieldGroup.fields.slice(0, remainingItems);
          remainingItems = remainingItems - slicedFieldList.length;
          return [key, slicedFieldList];
        })
    );
  }, [pageSize, fieldGroups, accordionState]);

  return (
    <div
      className="lnsIndexPatternFieldList"
      ref={(el) => {
        if (el && !el.dataset.dynamicScroll) {
          el.dataset.dynamicScroll = 'true';
          setScrollContainer(el);
        }
      }}
      onScroll={throttle(lazyScroll, 100)}
    >
      <div className="lnsIndexPatternFieldList__accordionContainer">
        <ul>
          {Object.entries(fieldGroups)
            .filter(([, { showInAccordion }]) => !showInAccordion)
            .flatMap(([, { fields }]) =>
              fields.map((field) => (
                <FieldItem
                  {...fieldProps}
                  exists={exists(field)}
                  field={field}
                  hideDetails={true}
                  key={field.name}
                />
              ))
            )}
        </ul>
        <EuiSpacer size="s" />
        {Object.entries(fieldGroups)
          .filter(([, { showInAccordion }]) => showInAccordion)
          .map(([key, fieldGroup]) => (
            <Fragment key={key}>
              <FieldsAccordion
                initialIsOpen={Boolean(accordionState[key])}
                key={key}
                id={`lnsIndexPattern${key}`}
                label={fieldGroup.title}
                exists={exists}
                hideDetails={fieldGroup.hideDetails}
                hasLoaded={!!hasSyncedExistingFields}
                fieldsCount={fieldGroup.fields.length}
                isFiltered={fieldGroup.fieldCount !== fieldGroup.fields.length}
                paginatedFields={paginatedFields[key]}
                fieldProps={fieldProps}
                onToggle={(open) => {
                  setAccordionState((s) => ({
                    ...s,
                    [key]: open,
                  }));
                  const displayedFieldLength = getDisplayedFieldsLength(fieldGroups, {
                    ...accordionState,
                    [key]: open,
                  });
                  setPageSize(
                    Math.max(PAGINATION_SIZE, Math.min(pageSize * 1.5, displayedFieldLength))
                  );
                }}
                showExistenceFetchError={existenceFetchFailed}
                renderCallout={
                  <NoFieldsCallout
                    isAffectedByGlobalFilter={fieldGroup.isAffectedByGlobalFilter}
                    isAffectedByTimerange={fieldGroup.isAffectedByTimeFilter}
                    isAffectedByFieldFilter={fieldGroup.fieldCount !== fieldGroup.fields.length}
                    existFieldsInIndex={!!existFieldsInIndex}
                    defaultNoFieldsMessage={fieldGroup.defaultNoFieldsMessage}
                  />
                }
              />
              <EuiSpacer size="m" />
            </Fragment>
          ))}
      </div>
    </div>
  );
}
