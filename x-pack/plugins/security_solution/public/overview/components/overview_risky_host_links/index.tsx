/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { useRiskyHostLinks } from '../../containers/overview_risky_host_links/use_risky_host_links';
import { RiskyHostsEnabledModule } from './risky_hosts_enabled_module';
import { RiskyHostsDisabledModule } from './risky_hosts_disabled_module';
export type RiskyHostLinksProps = Pick<GlobalTimeArgs, 'from' | 'to' | 'deleteQuery' | 'setQuery'>;

const RiskyHostLinksComponent: React.FC<RiskyHostLinksProps> = (props) => {
  const { listItems, isModuleEnabled } = useRiskyHostLinks(props);

  switch (isModuleEnabled) {
    case true:
      return (
        <RiskyHostsEnabledModule
          to={props.to}
          from={props.from}
          listItems={listItems}
          data-test-subj="risky-hosts-enabled-module"
        />
      );
    case false:
      return <RiskyHostsDisabledModule data-test-subj="risky-hosts-disabled-module" />;
    case undefined:
    default:
      return null;
  }
};

RiskyHostLinksComponent.displayName = 'RiskyHostLinksComponent';

export const RiskyHostLinks = React.memo(RiskyHostLinksComponent);
