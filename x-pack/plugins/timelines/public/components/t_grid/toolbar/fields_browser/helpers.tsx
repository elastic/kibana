/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import { filter, get, pickBy } from 'lodash/fp';
import styled from 'styled-components';

import {
  elementOrChildrenHasFocus,
  skipFocusInContainerTo,
  stopPropagationAndPreventDefault,
} from '../../../../../common/utils/accessibility';
import { TimelineId } from '../../../../../public/types';
import type { BrowserField, BrowserFields } from '../../../../../common/search_strategy';
import { defaultHeaders } from '../../../../store/t_grid/defaults';
import { DEFAULT_CATEGORY_NAME } from '../../body/column_headers/default_headers';

export const LoadingSpinner = styled(EuiLoadingSpinner)`
  cursor: pointer;
  position: relative;
  top: 3px;
`;

LoadingSpinner.displayName = 'LoadingSpinner';

export const CATEGORY_PANE_WIDTH = 200;
export const DESCRIPTION_COLUMN_WIDTH = 300;
export const FIELD_COLUMN_WIDTH = 200;
export const FIELD_BROWSER_WIDTH = 925;
export const FIELDS_PANE_WIDTH = 670;
export const HEADER_HEIGHT = 40;
export const PANES_FLEX_GROUP_WIDTH = CATEGORY_PANE_WIDTH + FIELDS_PANE_WIDTH + 10;
export const PANES_FLEX_GROUP_HEIGHT = 260;
export const TABLE_HEIGHT = 260;
export const TYPE_COLUMN_WIDTH = 50;

/**
 * Returns the CSS class name for the title of a category shown in the left
 * side field browser
 */
export const getCategoryPaneCategoryClassName = ({
  categoryId,
  timelineId,
}: {
  categoryId: string;
  timelineId: string;
}): string => `field-browser-category-pane-${categoryId}-${timelineId}`;

/**
 * Returns the CSS class name for the title of a category shown in the right
 * side of field browser
 */
export const getFieldBrowserCategoryTitleClassName = ({
  categoryId,
  timelineId,
}: {
  categoryId: string;
  timelineId: string;
}): string => `field-browser-category-title-${categoryId}-${timelineId}`;

/** Returns the class name for a field browser search input */
export const getFieldBrowserSearchInputClassName = (timelineId: string): string =>
  `field-browser-search-input-${timelineId}`;

/** Returns true if the specified category has at least one field */
export const categoryHasFields = (category: Partial<BrowserField>): boolean =>
  category.fields != null && Object.keys(category.fields).length > 0;

/** Returns the count of fields in the specified category */
export const getFieldCount = (category: Partial<BrowserField> | undefined): number =>
  category != null && category.fields != null ? Object.keys(category.fields).length : 0;

/**
 * Filters the specified `BrowserFields` to return a new collection where every
 * category contains at least one field name that matches the specified substring.
 */
export function filterBrowserFieldsByFieldName({
  browserFields,
  substring,
}: {
  browserFields: BrowserFields;
  substring: string;
}): BrowserFields {
  const trimmedSubstring = substring.trim();
  // an empty search param will match everything, so return the original browserFields
  if (trimmedSubstring === '') {
    return browserFields;
  }
  const result: Record<string, Partial<BrowserField>> = {};
  for (const [categoryName, categoryDescriptor] of Object.entries(browserFields)) {
    if (!categoryDescriptor.fields) {
      // ignore any category that is missing fields. This is not expected to happen.
      // eslint-disable-next-line no-continue
      continue;
    }

    // keep track of whether this category had a matching field, if so, we should emit it into the result
    let hadAMatch = false;

    // The fields that matched, for this `categoryName`
    const filteredFields: Record<string, Partial<BrowserField>> = {};

    for (const [fieldName, fieldDescriptor] of Object.entries(categoryDescriptor.fields)) {

      // For historical reasons, we consider the name as it appears on the field descriptor, not the `fieldName` (attribute name) itself.
      // It is unclear if there is any point in continuing to do this.
      const fieldNameFromDescriptor = fieldDescriptor.name;

      if (!fieldNameFromDescriptor) {
        // Ignore any field that is missing a name in its descriptor. This is not expected to happen.
        // eslint-disable-next-line no-continue
        continue;
      }

      // Check if this field matches (via substring comparison) the passed substring
      if (fieldNameFromDescriptor !== null && fieldNameFromDescriptor.includes(trimmedSubstring)) {

        // this field is a match, so we should emit this category into the result object.
        hadAMatch = true;

        // emit this field
        filteredFields[fieldName] = fieldDescriptor;
      }
    }

    if (hadAMatch) {
      // if at least one field matches, emit the category, but replace the `fields` attribute with the filtered fields
      result[categoryName] = {
        ...browserFields[categoryName],
        fields: filteredFields
      }
    }
  }
  return result;
}

/**
 * Returns a "virtual" category (e.g. default ECS) from the specified fieldIds
 */
export const createVirtualCategory = ({
  browserFields,
  fieldIds,
}: {
  browserFields: BrowserFields;
  fieldIds: string[];
}): Partial<BrowserField> => ({
  fields: fieldIds.reduce<Readonly<BrowserFields>>((fields, fieldId) => {
    const splitId = fieldId.split('.'); // source.geo.city_name -> [source, geo, city_name]
    const browserField = get(
      [splitId.length > 1 ? splitId[0] : 'base', 'fields', fieldId],
      browserFields
    );

    return {
      ...fields,
      ...(browserField
        ? {
            [fieldId]: {
              ...browserField,
              name: fieldId,
            },
          }
        : {}),
    };
  }, {}),
});

/** Merges the specified browser fields with the default category (i.e. `default ECS`) */
export const mergeBrowserFieldsWithDefaultCategory = (
  browserFields: BrowserFields
): BrowserFields => ({
  ...browserFields,
  [DEFAULT_CATEGORY_NAME]: createVirtualCategory({
    browserFields,
    fieldIds: defaultHeaders.map((header) => header.id),
  }),
});

export const getAlertColumnHeader = (timelineId: string, fieldId: string) =>
  timelineId === TimelineId.detectionsPage || timelineId === TimelineId.detectionsRulesDetailsPage
    ? defaultHeaders.find((c) => c.id === fieldId) ?? {}
    : {};

export const CATEGORIES_PANE_CLASS_NAME = 'categories-pane';
export const CATEGORY_TABLE_CLASS_NAME = 'category-table';
export const CLOSE_BUTTON_CLASS_NAME = 'close-button';
export const RESET_FIELDS_CLASS_NAME = 'reset-fields';
export const VIEW_ALL_BUTTON_CLASS_NAME = 'view-all';

export const categoriesPaneHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${CATEGORIES_PANE_CLASS_NAME}`)
  );

export const categoryTableHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${CATEGORY_TABLE_CLASS_NAME}`)
  );

export const closeButtonHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${CLOSE_BUTTON_CLASS_NAME}`)
  );

export const searchInputHasFocus = ({
  containerElement,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  timelineId: string;
}): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(
      `.${getFieldBrowserSearchInputClassName(timelineId)}`
    )
  );

export const viewAllHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${VIEW_ALL_BUTTON_CLASS_NAME}`)
  );

export const resetButtonHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${RESET_FIELDS_CLASS_NAME}`)
  );

export const scrollCategoriesPane = ({
  containerElement,
  selectedCategoryId,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  selectedCategoryId: string;
  timelineId: string;
}) => {
  if (selectedCategoryId !== '') {
    const selectedCategories =
      containerElement?.getElementsByClassName(
        getCategoryPaneCategoryClassName({
          categoryId: selectedCategoryId,
          timelineId,
        })
      ) ?? [];

    if (selectedCategories.length > 0) {
      selectedCategories[0].scrollIntoView();
    }
  }
};

export const focusCategoriesPane = ({
  containerElement,
  selectedCategoryId,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  selectedCategoryId: string;
  timelineId: string;
}) => {
  if (selectedCategoryId !== '') {
    const selectedCategories =
      containerElement?.getElementsByClassName(
        getCategoryPaneCategoryClassName({
          categoryId: selectedCategoryId,
          timelineId,
        })
      ) ?? [];

    if (selectedCategories.length > 0) {
      (selectedCategories[0] as HTMLButtonElement).focus();
    }
  }
};

export const focusCategoryTable = (containerElement: HTMLElement | null) => {
  const firstEntry = containerElement?.querySelector<HTMLDivElement>(
    `.${CATEGORY_TABLE_CLASS_NAME} [data-colindex="1"]`
  );

  if (firstEntry != null) {
    firstEntry.focus();
  } else {
    skipFocusInContainerTo({
      containerElement,
      className: CATEGORY_TABLE_CLASS_NAME,
    });
  }
};

export const focusCloseButton = (containerElement: HTMLElement | null) =>
  skipFocusInContainerTo({
    containerElement,
    className: CLOSE_BUTTON_CLASS_NAME,
  });

export const focusResetFieldsButton = (containerElement: HTMLElement | null) =>
  skipFocusInContainerTo({ containerElement, className: RESET_FIELDS_CLASS_NAME });

export const focusSearchInput = ({
  containerElement,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  timelineId: string;
}) =>
  skipFocusInContainerTo({
    containerElement,
    className: getFieldBrowserSearchInputClassName(timelineId),
  });

export const focusViewAllButton = (containerElement: HTMLElement | null) =>
  skipFocusInContainerTo({ containerElement, className: VIEW_ALL_BUTTON_CLASS_NAME });

export const onCategoriesPaneFocusChanging = ({
  containerElement,
  shiftKey,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  shiftKey: boolean;
  timelineId: string;
}) =>
  shiftKey
    ? focusSearchInput({
        containerElement,
        timelineId,
      })
    : focusViewAllButton(containerElement);

export const onCategoryTableFocusChanging = ({
  containerElement,
  shiftKey,
}: {
  containerElement: HTMLElement | null;
  shiftKey: boolean;
}) => (shiftKey ? focusViewAllButton(containerElement) : focusResetFieldsButton(containerElement));

export const onCloseButtonFocusChanging = ({
  containerElement,
  shiftKey,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  shiftKey: boolean;
  timelineId: string;
}) =>
  shiftKey
    ? focusResetFieldsButton(containerElement)
    : focusSearchInput({ containerElement, timelineId });

export const onSearchInputFocusChanging = ({
  containerElement,
  selectedCategoryId,
  shiftKey,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  selectedCategoryId: string;
  shiftKey: boolean;
  timelineId: string;
}) =>
  shiftKey
    ? focusCloseButton(containerElement)
    : focusCategoriesPane({ containerElement, selectedCategoryId, timelineId });

export const onViewAllFocusChanging = ({
  containerElement,
  selectedCategoryId,
  shiftKey,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  selectedCategoryId: string;
  shiftKey: boolean;
  timelineId: string;
}) =>
  shiftKey
    ? focusCategoriesPane({ containerElement, selectedCategoryId, timelineId })
    : focusCategoryTable(containerElement);

export const onResetButtonFocusChanging = ({
  containerElement,
  shiftKey,
}: {
  containerElement: HTMLElement | null;
  shiftKey: boolean;
}) => (shiftKey ? focusCategoryTable(containerElement) : focusCloseButton(containerElement));

export const onFieldsBrowserTabPressed = ({
  containerElement,
  keyboardEvent,
  selectedCategoryId,
  timelineId,
}: {
  containerElement: HTMLElement | null;
  keyboardEvent: React.KeyboardEvent;
  selectedCategoryId: string;
  timelineId: string;
}) => {
  const { shiftKey } = keyboardEvent;

  if (searchInputHasFocus({ containerElement, timelineId })) {
    stopPropagationAndPreventDefault(keyboardEvent);
    onSearchInputFocusChanging({
      containerElement,
      selectedCategoryId,
      shiftKey,
      timelineId,
    });
  } else if (categoriesPaneHasFocus(containerElement)) {
    stopPropagationAndPreventDefault(keyboardEvent);
    onCategoriesPaneFocusChanging({
      containerElement,
      shiftKey,
      timelineId,
    });
  } else if (viewAllHasFocus(containerElement)) {
    stopPropagationAndPreventDefault(keyboardEvent);
    onViewAllFocusChanging({
      containerElement,
      selectedCategoryId,
      shiftKey,
      timelineId,
    });
  } else if (categoryTableHasFocus(containerElement)) {
    stopPropagationAndPreventDefault(keyboardEvent);
    onCategoryTableFocusChanging({
      containerElement,
      shiftKey,
    });
  } else if (resetButtonHasFocus(containerElement)) {
    stopPropagationAndPreventDefault(keyboardEvent);
    onResetButtonFocusChanging({
      containerElement,
      shiftKey,
    });
  } else if (closeButtonHasFocus(containerElement)) {
    stopPropagationAndPreventDefault(keyboardEvent);
    onCloseButtonFocusChanging({
      containerElement,
      shiftKey,
      timelineId,
    });
  }
};

export const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

CountBadge.displayName = 'CountBadge';
