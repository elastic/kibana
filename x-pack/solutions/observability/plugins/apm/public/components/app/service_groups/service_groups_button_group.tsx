/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const buttonGroupOptions = {
  allServices: {
    option: {
      id: 'allServices',
      label: i18n.translate('xpack.apm.serviceGroups.buttonGroup.allServices', {
        defaultMessage: 'All services',
      }),
    },
    pathname: '/services',
  },
  serviceGroups: {
    option: {
      id: 'serviceGroups',
      label: i18n.translate('xpack.apm.serviceGroups.buttonGroup.serviceGroups', {
        defaultMessage: 'Service groups',
      }),
    },
    pathname: '/service-groups',
  },
};

type SelectedNavButton = keyof typeof buttonGroupOptions;

export function ServiceGroupsButtonGroup({
  selectedNavButton,
}: {
  selectedNavButton: SelectedNavButton;
}) {
  const history = useHistory();

  useEffect(() => {
    const group = document.querySelector('[data-test-subj="apmServiceGroupsButtonGroup"]');
    const button = group?.querySelector('button[aria-pressed="true"]') as HTMLButtonElement | null;
    button?.focus();
  }, [selectedNavButton]);

  return (
    <EuiButtonGroup
      data-test-subj="apmServiceGroupsButtonGroup"
      color="primary"
      options={[buttonGroupOptions.allServices.option, buttonGroupOptions.serviceGroups.option]}
      idSelected={selectedNavButton as string}
      onChange={(id) => {
        const { pathname } = buttonGroupOptions[id as SelectedNavButton];
        history.push({ pathname });
      }}
      legend={i18n.translate('xpack.apm.servicesGroups.buttonGroup.legend', {
        defaultMessage: 'View all services or service groups',
      })}
    />
  );
}
