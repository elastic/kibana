/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useMemo } from 'react';
import ServicesWrapper from './services_wrapper';
import type { ServicesWrapperProps } from './services_wrapper';
import type { OsqueryActionProps } from './osquery_action';
import type { AlertEcsData } from '../common/contexts';
import { AlertAttachmentContext } from '../common/contexts';

export const getLazyOsqueryAction =
  (services: ServicesWrapperProps['services']) =>
  // eslint-disable-next-line react/display-name
  (props: OsqueryActionProps & { ecsData?: AlertEcsData }) => {
    const OsqueryAction = lazy(() => import('./osquery_action'));

    const { ecsData, ...restProps } = props;
    const renderAction = useMemo(() => {
      if (ecsData && ecsData?._id) {
        return (
          <AlertAttachmentContext.Provider value={ecsData}>
            <OsqueryAction {...restProps} />
          </AlertAttachmentContext.Provider>
        );
      }

      return <OsqueryAction {...restProps} />;
    }, [OsqueryAction, ecsData, restProps]);

    return (
      <Suspense fallback={null}>
        <ServicesWrapper services={services}>{renderAction}</ServicesWrapper>
      </Suspense>
    );
  };
