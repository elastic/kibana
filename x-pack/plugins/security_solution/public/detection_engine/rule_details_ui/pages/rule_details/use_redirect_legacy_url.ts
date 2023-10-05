/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n as i18nTranslate } from '@kbn/i18n';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { Rule } from '../../../rule_management/logic';

export interface UseLegacyUrlRedirectParams {
  rule: Rule | null;
  spacesApi?: SpacesApi;
}

export const useLegacyUrlRedirect = ({ rule, spacesApi }: UseLegacyUrlRedirectParams) => {
  useEffect(() => {
    if (rule) {
      const outcome = rule.outcome;
      if (spacesApi && outcome === 'aliasMatch') {
        // This rule has been resolved from a legacy URL - redirect the user to the new URL and display a toast.
        const path = `rules/id/${rule.id}${window.location.search}${window.location.hash}`;
        spacesApi.ui.redirectLegacyUrl({
          path,
          aliasPurpose: rule.alias_purpose,
          objectNoun: i18nTranslate.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.redirectObjectNoun',
            { defaultMessage: 'rule' }
          ),
        });
      }
    }
  }, [rule, spacesApi]);
};
