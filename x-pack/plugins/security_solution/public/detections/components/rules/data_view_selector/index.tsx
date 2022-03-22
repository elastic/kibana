/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { EuiFormRow, EuiComboBox } from '@elastic/eui';
// import React, { useCallback, useEffect, useState } from 'react';
// import { Subscription } from 'rxjs';
// import styled from 'styled-components';
// import deepEqual from 'fast-deep-equal';
// import type { DataViewBase, Filter, Query } from '@kbn/es-query';
// import { FilterManager, SavedQuery } from '../../../../../../../../src/plugins/data/public';

// import { BrowserFields } from '../../../../common/containers/source';
// import { OpenTimelineModal } from '../../../../timelines/components/open_timeline/open_timeline_modal';
// import { ActionTimelineToShow } from '../../../../timelines/components/open_timeline/types';
// import { QueryBar } from '../../../../common/components/query_bar';
// import { buildGlobalQuery } from '../../../../timelines/components/timeline/helpers';
// import { getDataProviderFilter } from '../../../../timelines/components/timeline/query_bar';
// import { convertKueryToElasticSearchQuery } from '../../../../common/lib/keury';
// import { useKibana } from '../../../../common/lib/kibana';
// import { TimelineModel } from '../../../../timelines/store/timeline/model';
// import { useSavedQueryServices } from '../../../../common/utils/saved_query_services';
// import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
// import * as i18n from './translations';

// export interface FieldValueQueryBar {
//   filters: Filter[];
//   query: Query;
//   saved_id?: string;
// }
// interface QueryBarDefineRuleProps {
//   browserFields: BrowserFields;
//   dataTestSubj: string;
//   field: FieldHook;
//   idAria: string;
//   isLoading: boolean;
//   indexPattern: DataViewBase;
//   onCloseTimelineSearch: () => void;
//   openTimelineSearch: boolean;
//   resizeParentContainer?: (height: number) => void;
//   onValidityChange?: (arg: boolean) => void;
// }

// const actionTimelineToHide: ActionTimelineToShow[] = ['duplicate', 'createFrom'];

// const StyledEuiFormRow = styled(EuiFormRow)`
//   .kbnTypeahead__items {
//     max-height: 45vh !important;
//   }
//   .globalQueryBar {
//     padding: 4px 0px 0px 0px;
//     .kbnQueryBar {
//       & > div:first-child {
//         margin: 0px 0px 0px 4px;
//       }
//       &__wrap,
//       &__textarea {
//         z-index: 0;
//       }
//     }
//   }
// `;

// // TODO need to add disabled in the SearchBar

// export const QueryBarDefineRule = ({
//   browserFields,
//   dataTestSubj,
//   field,
//   idAria,
//   indexPattern,
//   isLoading = false,
//   onCloseTimelineSearch,
//   openTimelineSearch = false,
//   resizeParentContainer,
//   onValidityChange,
// }: QueryBarDefineRuleProps) => {
//   const { value: fieldValue, setValue: setFieldValue } = field as FieldHook<FieldValueQueryBar>;
//   const [originalHeight, setOriginalHeight] = useState(-1);
//   const [loadingTimeline, setLoadingTimeline] = useState(false);
//   const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);
//   const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

//   const { uiSettings } = useKibana().services;
//   const [filterManager] = useState<FilterManager>(new FilterManager(uiSettings));

//   const savedQueryServices = useSavedQueryServices();

//   // Bubbles up field validity to parent.
//   // Using something like form `getErrors` does
//   // not guarantee latest validity state
//   useEffect((): void => {
//     if (onValidityChange != null) {
//       onValidityChange(!isInvalid);
//     }
//   }, [isInvalid, onValidityChange]);

//   useEffect(() => {
//     let isSubscribed = true;
//     const subscriptions = new Subscription();
//     filterManager.setFilters([]);

//     subscriptions.add(
//       filterManager.getUpdates$().subscribe({
//         next: () => {
//           if (isSubscribed) {
//             const newFilters = filterManager.getFilters();
//             const { filters } = fieldValue;

//             if (!deepEqual(filters, newFilters)) {
//               setFieldValue({ ...fieldValue, filters: newFilters });
//             }
//           }
//         },
//       })
//     );

//     return () => {
//       isSubscribed = false;
//       subscriptions.unsubscribe();
//     };
//   }, [fieldValue, filterManager, setFieldValue]);

//   useEffect(() => {
//     let isSubscribed = true;
//     async function updateFilterQueryFromValue() {
//       const { filters, saved_id: savedId } = fieldValue;
//       if (!deepEqual(filters, filterManager.getFilters())) {
//         filterManager.setFilters(filters);
//       }
//       if (
//         (savedId != null && savedQuery != null && savedId !== savedQuery.id) ||
//         (savedId != null && savedQuery == null)
//       ) {
//         try {
//           const mySavedQuery = await savedQueryServices.getSavedQuery(savedId);
//           if (isSubscribed && mySavedQuery != null) {
//             setSavedQuery(mySavedQuery);
//           }
//         } catch {
//           setSavedQuery(undefined);
//         }
//       } else if (savedId == null && savedQuery != null) {
//         setSavedQuery(undefined);
//       }
//     }
//     updateFilterQueryFromValue();
//     return () => {
//       isSubscribed = false;
//     };
//   }, [fieldValue, filterManager, savedQuery, savedQueryServices]);

//   const onSubmitQuery = useCallback(
//     (newQuery: Query) => {
//       const { query } = fieldValue;
//       if (!deepEqual(query, newQuery)) {
//         setFieldValue({ ...fieldValue, query: newQuery });
//       }
//     },
//     [fieldValue, setFieldValue]
//   );

//   const onChangedQuery = useCallback(
//     (newQuery: Query) => {
//       const { query } = fieldValue;
//       if (!deepEqual(query, newQuery)) {
//         setFieldValue({ ...fieldValue, query: newQuery });
//       }
//     },
//     [fieldValue, setFieldValue]
//   );

//   const onSavedQuery = useCallback(
//     (newSavedQuery: SavedQuery | undefined) => {
//       if (newSavedQuery != null) {
//         const { saved_id: savedId } = fieldValue;
//         if (newSavedQuery.id !== savedId) {
//           setSavedQuery(newSavedQuery);
//           setFieldValue({
//             filters: newSavedQuery.attributes.filters ?? [],
//             query: newSavedQuery.attributes.query,
//             saved_id: newSavedQuery.id,
//           });
//         } else {
//           setSavedQuery(newSavedQuery);
//           setFieldValue({
//             filters: [],
//             query: {
//               query: '',
//               language: 'kuery',
//             },
//             saved_id: undefined,
//           });
//         }
//       }
//     },
//     [fieldValue, setFieldValue]
//   );

//   const onCloseTimelineModal = useCallback(() => {
//     setLoadingTimeline(true);
//     onCloseTimelineSearch();
//   }, [onCloseTimelineSearch]);

//   const onOpenTimeline = useCallback(
//     (timeline: TimelineModel) => {
//       setLoadingTimeline(false);
//       const newQuery = {
//         query: timeline.kqlQuery.filterQuery?.kuery?.expression ?? '',
//         language: timeline.kqlQuery.filterQuery?.kuery?.kind ?? 'kuery',
//       };
//       const dataProvidersDsl =
//         timeline.dataProviders != null && timeline.dataProviders.length > 0
//           ? convertKueryToElasticSearchQuery(
//               buildGlobalQuery(timeline.dataProviders, browserFields),
//               indexPattern
//             )
//           : '';
//       const newFilters = timeline.filters ?? [];
//       setFieldValue({
//         filters:
//           dataProvidersDsl !== ''
//             ? [...newFilters, getDataProviderFilter(dataProvidersDsl)]
//             : newFilters,
//         query: newQuery,
//         saved_id: undefined,
//       });
//     },
//     [browserFields, indexPattern, setFieldValue]
//   );

//   const onMutation = () => {
//     if (resizeParentContainer != null) {
//       const suggestionContainer = document.getElementById('kbnTypeahead__items');
//       if (suggestionContainer != null) {
//         const box = suggestionContainer.getBoundingClientRect();
//         const accordionContainer = document.getElementById('define-rule');
//         if (accordionContainer != null) {
//           const accordionBox = accordionContainer.getBoundingClientRect();
//           if (originalHeight === -1 || accordionBox.height < originalHeight + box.height) {
//             resizeParentContainer(originalHeight + box.height - 100);
//           }
//           if (originalHeight === -1) {
//             setOriginalHeight(accordionBox.height);
//           }
//         }
//       } else {
//         resizeParentContainer(-1);
//       }
//     }
//   };

//   return (
//     <>
//       <EuiComboBox
//         data-test-subj="sourcerer-combo-box"
//         fullWidth
//         isDisabled={false}
//         options={allOptions}
//         placeholder={i18n.PICK_INDEX_PATTERNS}
//         renderOption={renderOption}
//         selectedOptions={selectedOptions}
//       />
//     </>
//   );
// };
