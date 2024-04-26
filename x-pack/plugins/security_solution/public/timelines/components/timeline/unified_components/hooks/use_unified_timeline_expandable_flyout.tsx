/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useLocation } from 'react-router-dom';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { ENABLE_EXPANDABLE_FLYOUT_SETTING } from '../../../../../../common/constants';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';

const EMPTY_TIMELINE_FLYOUT_SEARCH_PARAMS = '()';

export const useUnifiedTableExpandableFlyout = () => {
  const expandableTimelineFlyoutEnabled = useIsExperimentalFeatureEnabled(
    'expandableTimelineFlyoutEnabled'
  );

  const [isSecurityFlyoutEnabled] = useUiSetting$<boolean>(ENABLE_EXPANDABLE_FLYOUT_SETTING);

  const location = useLocation();

  const { openFlyout, closeFlyout } = useExpandableFlyoutApi();

  const isNewExpandableFlyoutOpen = useMemo(() => {
    /**
     *  Currently, if new expanable flyout is closed, there is not way for
     *  consumer to trigger an effect `onClose` of flyout. So, we are using
     *  this hack to know if flyout is open or not.
     *
     *  Raised: https://github.com/elastic/kibana/issues/179520
     *
     * */
    const searchParams = new URLSearchParams(location.search);
    return (
      searchParams.has(URL_PARAM_KEY.timelineFlyout) &&
      searchParams.get(URL_PARAM_KEY.timelineFlyout) !== EMPTY_TIMELINE_FLYOUT_SEARCH_PARAMS
    );
  }, [location.search]);

  return {
    isTimelineExpandableFlyoutOpen: isNewExpandableFlyoutOpen,
    openFlyout,
    closeFlyout,
    isTimelineExpandableFlyoutEnabled: expandableTimelineFlyoutEnabled && isSecurityFlyoutEnabled,
  };
};
