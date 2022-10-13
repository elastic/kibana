/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { usePrePackagedRulesStatus } from '../../../../detection_engine/rule_management/logic/use_pre_packaged_rules_status';
import { LoadPrePackagedRules } from './load_prepackaged_rules';
import * as i18n from './translations';

const UpdatePrePackagedRulesCallOutComponent = () => {
  const { services } = useKibana();
  const { data: prePackagedRulesStatus } = usePrePackagedRulesStatus();
  const rulesNotUpdated = prePackagedRulesStatus?.rulesNotUpdated ?? 0;
  const timelinesNotUpdated = prePackagedRulesStatus?.timelinesNotUpdated ?? 0;

  const prepackagedRulesOrTimelines = useMemo(() => {
    if (rulesNotUpdated > 0 && timelinesNotUpdated === 0) {
      return {
        callOutMessage: i18n.UPDATE_PREPACKAGED_RULES_MSG(rulesNotUpdated),
        buttonTitle: i18n.UPDATE_PREPACKAGED_RULES(rulesNotUpdated),
      };
    } else if (rulesNotUpdated === 0 && timelinesNotUpdated > 0) {
      return {
        callOutMessage: i18n.UPDATE_PREPACKAGED_TIMELINES_MSG(timelinesNotUpdated),
        buttonTitle: i18n.UPDATE_PREPACKAGED_TIMELINES(timelinesNotUpdated),
      };
    } else if (rulesNotUpdated > 0 && timelinesNotUpdated > 0)
      return {
        callOutMessage: i18n.UPDATE_PREPACKAGED_RULES_AND_TIMELINES_MSG(
          rulesNotUpdated,
          timelinesNotUpdated
        ),
        buttonTitle: i18n.UPDATE_PREPACKAGED_RULES_AND_TIMELINES(
          rulesNotUpdated,
          timelinesNotUpdated
        ),
      };
  }, [rulesNotUpdated, timelinesNotUpdated]);

  return (
    <EuiCallOut title={i18n.UPDATE_PREPACKAGED_RULES_TITLE} data-test-subj="update-callout">
      <p>
        {prepackagedRulesOrTimelines?.callOutMessage}
        <br />
        <EuiLink href={`${services.docLinks.links.siem.ruleChangeLog}`} target="_blank">
          {i18n.RELEASE_NOTES_HELP}
        </EuiLink>
      </p>
      <LoadPrePackagedRules>
        {(renderProps) => (
          <EuiButton size="s" data-test-subj="update-callout-button" {...renderProps}>
            {prepackagedRulesOrTimelines?.buttonTitle}
          </EuiButton>
        )}
      </LoadPrePackagedRules>
    </EuiCallOut>
  );
};

export const UpdatePrePackagedRulesCallOut = memo(UpdatePrePackagedRulesCallOutComponent);
