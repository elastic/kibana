/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer, EuiText, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ElasticDocsLink } from '../../shared/links/elastic_docs_link';

export type TourType = 'createGroup' | 'editGroup' | 'serviceGroupCard';

interface Props {
  title: string;
  content: string;
  tourEnabled: boolean;
  dismissTour: () => void;
  children: React.ReactElement;
}

export function ServiceGroupsTour({
  tourEnabled,
  dismissTour,
  title,
  content,
  children,
}: Props) {
  return (
    <EuiTourStep
      content={
        <>
          <EuiText size="s">{content}</EuiText>
          <EuiSpacer />
          <FormattedMessage
            id="xpack.apm.serviceGroups.tour.content.link"
            defaultMessage="Learn more in the {docsLink}."
            values={{
              docsLink: (
                <ElasticDocsLink
                  section="/kibana"
                  path="/services.html"
                  target="blank"
                >
                  {i18n.translate(
                    'xpack.apm.serviceGroups.tour.content.link.docs',
                    {
                      defaultMessage: 'docs',
                    }
                  )}
                </ElasticDocsLink>
              ),
            }}
          />
        </>
      }
      isStepOpen={tourEnabled}
      onFinish={() => {}}
      maxWidth={300}
      minWidth={300}
      step={1}
      stepsTotal={1}
      title={title}
      anchorPosition="leftUp"
      footerAction={
        <EuiButtonEmpty color="text" size="xs" onClick={dismissTour}>
          {i18n.translate('xpack.apm.serviceGroups.tour.dismiss', {
            defaultMessage: 'Dismiss',
          })}
        </EuiButtonEmpty>
      }
    >
      {children}
    </EuiTourStep>
  );
}
