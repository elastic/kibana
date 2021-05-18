/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from '../../components/app/cases/translations';
import { Create } from '../../components/app/cases/create';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { getCaseUrl } from './links';

const ButtonEmpty = styled(EuiButtonEmpty)`
  display: block;
`;
ButtonEmpty.displayName = 'ButtonEmpty';
export const CreateCasePage = React.memo(() => {
  const history = useHistory();
  // const userPermissions = useGetUserCasesPermissions();

  const backOptions = useMemo(
    () => ({
      href: getCaseUrl(),
      text: i18n.BACK_TO_ALL,
    }),
    []
  );
  const goTo = useCallback(
    (ev) => {
      ev.preventDefault();
      if (backOptions) {
        history.push(backOptions.href ?? '');
      }
    },
    [backOptions, history]
  );

  // if (userPermissions != null && !userPermissions.crud) {
  //   history.replace(getCaseUrl(search));
  //   return null;
  // }

  return (
    <EuiPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            <ButtonEmpty onClick={goTo} iconType="arrowLeft" iconSide="left" flush="left">
              {backOptions.text}
            </ButtonEmpty>
            {i18n.CREATE_TITLE} <ExperimentalBadge />
          </>
        ),
      }}
    >
      <Create />
    </EuiPageTemplate>
  );
});

CreateCasePage.displayName = 'CreateCasePage';
