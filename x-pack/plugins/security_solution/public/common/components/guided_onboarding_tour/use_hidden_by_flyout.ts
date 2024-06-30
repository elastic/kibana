/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { RisonValue } from '@kbn/rison';
import type { AlertsCasesTourSteps } from './tour_config';
import {
  hiddenWhenCaseFlyoutExpanded,
  hiddenWhenLeftExpandableFlyoutExpanded,
  SecurityStepId,
} from './tour_config';
import { useKibana } from '../../lib/kibana';
import { URL_PARAM_KEY } from '../../hooks/use_url_state';
import { getObjectFromQueryString } from '../../utils/global_query_string/helpers';

interface UseHiddenByFlyoutProps {
  tourId: SecurityStepId;
  step: AlertsCasesTourSteps;
}

/*
 ** To check if given Guided tour step should be hidden when the LEFT expandable flyout
 ** or any case modal is opened
 */
export const useHiddenByFlyout = ({ tourId, step }: UseHiddenByFlyoutProps) => {
  const { useIsAddToCaseOpen } = useKibana().services.cases.hooks;
  const isAddToCaseOpen = useIsAddToCaseOpen();

  const { search } = useLocation();

  const expandableFlyoutKey = useMemo(
    () =>
      getObjectFromQueryString<{ left: RisonValue; right: RisonValue }>(
        URL_PARAM_KEY.flyout,
        search
      ),
    [search]
  );

  const isExpandableFlyoutExpanded = expandableFlyoutKey?.left;

  const hiddenWhenExpandableFlyoutOpened = useMemo(
    () =>
      isExpandableFlyoutExpanded &&
      hiddenWhenLeftExpandableFlyoutExpanded[SecurityStepId.alertsCases]?.includes(step),
    [isExpandableFlyoutExpanded, step]
  );

  const hiddenWhenCasesModalFlyoutExpanded = useMemo(
    () => isAddToCaseOpen && hiddenWhenCaseFlyoutExpanded[tourId]?.includes(step),
    [isAddToCaseOpen, tourId, step]
  );

  return hiddenWhenExpandableFlyoutOpened || hiddenWhenCasesModalFlyoutExpanded;
};
