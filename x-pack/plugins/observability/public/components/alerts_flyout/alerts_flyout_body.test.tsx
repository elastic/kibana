/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '../../utils/test_helper';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AlertsFlyoutBody } from './alerts_flyout_body';
import { inventoryThresholdAlert } from '../../rules/fixtures/example_alerts';
import { parseAlert } from '../../pages/alerts/helpers/parse_alert';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';

describe('AlertsFlyoutBody', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
  const observabilityRuleTypeRegistryMock = createObservabilityRuleTypeRegistryMock();

  const setup = (id: string) => {
    const dataFieldEs = inventoryThresholdAlert.reduce(
      (acc, d) => ({ ...acc, [d.field]: d.value }),
      {}
    );
    const alert = parseAlert(observabilityRuleTypeRegistryMock)(dataFieldEs);
    return render(<AlertsFlyoutBody alert={alert} id={id} />);
  };

  it('should render View rule detail link', async () => {
    const flyout = setup('test');
    expect(flyout.getByTestId('viewRuleDetailsFlyout')).toBeInTheDocument();
  });

  it('should NOT render View rule detail link for RULE_DETAILS_PAGE_ID', async () => {
    const flyout = setup(RULE_DETAILS_PAGE_ID);
    expect(flyout.queryByTestId('viewRuleDetailsFlyout')).not.toBeInTheDocument();
  });
});
