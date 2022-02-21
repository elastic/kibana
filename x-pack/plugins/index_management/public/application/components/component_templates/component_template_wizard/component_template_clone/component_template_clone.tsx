/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { PageLoading, attemptToURIDecode } from '../../shared_imports';
import { useComponentTemplatesContext } from '../../component_templates_context';
import { ComponentTemplateCreate } from '../component_template_create';

export interface Params {
  sourceComponentTemplateName: string;
}

export const ComponentTemplateClone: FunctionComponent<RouteComponentProps<Params>> = (props) => {
  const { sourceComponentTemplateName } = props.match.params;
  const decodedSourceName = attemptToURIDecode(sourceComponentTemplateName)!;

  const { toasts, api } = useComponentTemplatesContext();

  const {
    error,
    data: componentTemplateToClone,
    isLoading,
  } = api.useLoadComponentTemplate(decodedSourceName);

  useEffect(() => {
    if (error && !isLoading) {
      // Toasts expects a generic Error object, which is typed as having a required name property.
      toasts.addError({ ...error, name: '' } as Error, {
        title: i18n.translate('xpack.idxMgmt.componentTemplateClone.loadComponentTemplateTitle', {
          defaultMessage: `Error loading component template '{sourceComponentTemplateName}'.`,
          values: { sourceComponentTemplateName },
        }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, isLoading]);

  if (isLoading) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateEdit.loadingDescription"
          defaultMessage="Loading component template…"
        />
      </PageLoading>
    );
  } else {
    // We still show the create form (unpopulated) even if we were not able to load the
    // selected component template data.
    const sourceComponentTemplate = componentTemplateToClone
      ? { ...componentTemplateToClone, name: `${componentTemplateToClone.name}-copy` }
      : undefined;

    return <ComponentTemplateCreate {...props} sourceComponentTemplate={sourceComponentTemplate} />;
  }
};
