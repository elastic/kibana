/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTitle, EuiPanel } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { formatTestSubj } from '../../../shared/format_test_subj';
import { EuiButton } from '../../../shared/react_router_helpers';

interface IProductCard {
  name: string;
  description: string;
  img: string;
  buttonPath: string;
}

export const ProductCard: React.FC<IProductCard> = ({ name, description, img, buttonPath }) => {
  return (
    <EuiPanel className="card product-card" paddingSize="none">
      <div className="product-card__image-container">
        <img
          className="product-card__image"
          alt={i18n.translate('xpack.enterpriseSearch.productCard.productCardImage', {
            defaultMessage: `${name} Dashboard`,
          })}
          src={img}
        />
      </div>
      <div className="product-card__content">
        <div className="product-card__inner-content">
          <EuiTitle size="m">
            <h2 className="card__title">
              {i18n.translate('xpack.enterpriseSearch.productCard.productCardHeading', {
                defaultMessage: `Elastic ${name}`,
              })}
            </h2>
          </EuiTitle>
          <p className="card__description">{description}</p>
          <EuiButton fill to={buttonPath} data-test-subj={`Launch${formatTestSubj(name)}Button`}>
            {i18n.translate('xpack.enterpriseSearch.productCard.productCardButton', {
              defaultMessage: `Launch ${name}`,
            })}
          </EuiButton>
        </div>
      </div>
    </EuiPanel>
  );
};
