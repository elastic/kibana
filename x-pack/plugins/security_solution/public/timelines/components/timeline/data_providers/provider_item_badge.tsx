/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { TimelineType } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineSelectors } from '../../../store/timeline';

import { OnDataProviderEdited } from '../events';
import { ProviderBadge } from './provider_badge';
import { ProviderItemActions } from './provider_item_actions';
import { DataProvidersAnd, DataProviderType, QueryOperator } from './data_provider';
import { dragAndDropActions } from '../../../../common/store/drag_and_drop';
import { useManageTimeline } from '../../manage_timeline';

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
  val: string | number;
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
    const { getManageTimelineById } = useManageTimeline();
    const isLoading = useMemo(() => getManageTimelineById(timelineId ?? '').isLoading, [
      getManageTimelineById,
      timelineId,
    ]);

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
          val={val}
          operator={operator}
          type={type}
          timelineType={timelineType}
        />
      ),
      [
        deleteProvider,
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
