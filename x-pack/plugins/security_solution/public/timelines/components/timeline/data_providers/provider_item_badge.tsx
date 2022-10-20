/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineType } from '../../../../../common/types/timeline';
import type { BrowserFields } from '../../../../common/containers/source';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../common/hooks/use_selector';
import { timelineSelectors } from '../../../store/timeline';

import type { OnDataProviderEdited } from '../events';
import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';
import type { DataProvidersAnd, QueryOperator } from './data_provider';
import { DataProviderType } from './data_provider';
import { dragAndDropActions } from '../../../../common/store/drag_and_drop';
import { timelineDefaults } from '../../../store/timeline/defaults';

interface ProviderItemBadgeProps {
  andProviderId?: string;
  browserFields?: BrowserFields;
  deleteProvider: () => void;
  field: string;
  kqlQuery: string;
  isEnabled: boolean;
  isExcluded: boolean;
  isPopoverOpen: boolean;
  onDataProviderEdited?: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  register?: DataProvidersAnd;
  setIsPopoverOpen: (isPopoverOpen: boolean) => void;
  timelineId?: string;
  toggleEnabledProvider: () => void;
  toggleExcludedProvider: () => void;
  toggleTypeProvider: () => void;
  displayValue?: string;
  val: string | number | Array<string | number>;
  type?: DataProviderType;
  wrapperRef?: React.MutableRefObject<HTMLDivElement | null>;
}

export const ProviderItemBadge = React.memo<ProviderItemBadgeProps>(
  ({
    andProviderId,
    browserFields,
    deleteProvider,
    field,
    kqlQuery,
    isEnabled,
    isExcluded,
    isPopoverOpen,
    onDataProviderEdited,
    operator,
    providerId,
    register,
    setIsPopoverOpen,
    timelineId,
    toggleEnabledProvider,
    toggleExcludedProvider,
    toggleTypeProvider,
    displayValue,
    val,
    type = DataProviderType.default,
    wrapperRef,
  }) => {
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
    const timelineType = useShallowEqualSelector((state) => {
      if (!timelineId) {
        return TimelineType.default;
      }

      return getTimeline(state, timelineId)?.timelineType ?? TimelineType.default;
    });

    const { isLoading } = useDeepEqualSelector(
      (state) => getTimeline(state, timelineId ?? '') ?? timelineDefaults
    );

    const togglePopover = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen, setIsPopoverOpen]);

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
      wrapperRef?.current?.focus();
    }, [wrapperRef, setIsPopoverOpen]);

    const onToggleEnabledProvider = useCallback(() => {
      toggleEnabledProvider();
      closePopover();
    }, [closePopover, toggleEnabledProvider]);

    const onToggleExcludedProvider = useCallback(() => {
      toggleExcludedProvider();
      closePopover();
    }, [toggleExcludedProvider, closePopover]);

    const onToggleTypeProvider = useCallback(() => {
      toggleTypeProvider();
      closePopover();
    }, [toggleTypeProvider, closePopover]);

    const [providerRegistered, setProviderRegistered] = useState(false);

    const dispatch = useDispatch();

    useEffect(() => {
      // optionally register the provider if provided
      if (register != null) {
        dispatch(dragAndDropActions.registerProvider({ provider: { ...register, and: [] } }));
        setProviderRegistered(true);
      }
    }, [providerRegistered, dispatch, register, setProviderRegistered]);

    const unRegisterProvider = useCallback(() => {
      if (providerRegistered && register != null) {
        dispatch(dragAndDropActions.unRegisterProvider({ id: register.id }));
      }
    }, [providerRegistered, dispatch, register]);

    useEffect(
      () => () => {
        unRegisterProvider();
      },
      [unRegisterProvider]
    );

    const button = useMemo(
      () => (
        <ProviderBadge
          deleteProvider={!isLoading ? deleteProvider : noop}
          field={field}
          kqlQuery={kqlQuery}
          isEnabled={isEnabled}
          isExcluded={isExcluded}
          providerId={providerId}
          togglePopover={togglePopover}
          toggleType={onToggleTypeProvider}
          displayValue={displayValue ?? String(val)}
          val={val}
          operator={operator}
          type={type}
          timelineType={timelineType}
        />
      ),
      [
        deleteProvider,
        displayValue,
        field,
        isEnabled,
        isExcluded,
        isLoading,
        kqlQuery,
        onToggleTypeProvider,
        operator,
        providerId,
        timelineType,
        togglePopover,
        type,
        val,
      ]
    );

    return (
      <ProviderItemActions
        andProviderId={andProviderId}
        browserFields={browserFields}
        button={button}
        closePopover={closePopover}
        deleteProvider={deleteProvider}
        field={field}
        kqlQuery={kqlQuery}
        isEnabled={isEnabled}
        isExcluded={isExcluded}
        isLoading={isLoading}
        isOpen={isPopoverOpen}
        onDataProviderEdited={onDataProviderEdited}
        operator={operator}
        providerId={providerId}
        timelineId={timelineId}
        timelineType={timelineType}
        toggleEnabledProvider={onToggleEnabledProvider}
        toggleExcludedProvider={onToggleExcludedProvider}
        toggleTypeProvider={onToggleTypeProvider}
        value={val}
        type={type}
      />
    );
  }
);

ProviderItemBadge.displayName = 'ProviderItemBadge';
