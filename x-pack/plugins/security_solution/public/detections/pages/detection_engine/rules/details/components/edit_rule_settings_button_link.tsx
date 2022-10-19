import React, { useCallback } from 'react';
import { useKibana } from '../../../../../../common/lib/kibana';
import { SecuritySolutionLinkButton } from '../../../../../../common/components/links';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { SecurityPageName } from '../../../../../../app/types';
import { getEditRuleUrl } from '../../../../../../common/components/link_to/redirect_to_detection_engine';
import * as ruleI18n from '../../translations';
import { EuiToolTip } from '@elastic/eui';

type EditRuleSettingButtonLinkProps = {
  ruleId: string;
  disabled: boolean;
  disabledReason?: string;
};

export function EditRuleSettingButtonLink({
  ruleId,
  disabled = false,
  disabledReason,
}: EditRuleSettingButtonLinkProps): JSX.Element {
  const {
    application: { navigateToApp },
  } = useKibana().services;
  const goToEditRule = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getEditRuleUrl(ruleId ?? ''),
      });
    },
    [navigateToApp, ruleId]
  );

  return (
    <EuiToolTip position="top" content={disabledReason}>
      <SecuritySolutionLinkButton
        data-test-subj="editRuleSettingsLink"
        onClick={goToEditRule}
        iconType="controlsHorizontal"
        isDisabled={disabled}
        deepLinkId={SecurityPageName.rules}
        path={getEditRuleUrl(ruleId ?? '')}
      >
        {ruleI18n.EDIT_RULE_SETTINGS}
      </SecuritySolutionLinkButton>
    </EuiToolTip>
  );
}
