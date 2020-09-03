/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCard, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { formatTestSubj } from '../../../shared/format_test_subj';
import { EuiButton } from '../../../shared/react_router_helpers';

import './product_card.scss';

interface IProductCard {
  name: string;
  description: string;
  img: string;
  buttonPath: string;
}

export const ProductCard: React.FC<IProductCard> = ({ name, description, img, buttonPath }) => {
  return (
    <EuiCard
      className="productCard"
      titleElement="h2"
      title={i18n.translate('xpack.enterpriseSearch.productCard.productCardHeading', {
        defaultMessage: `Elastic ${name}`,
      })}
      image={
        <div className="productCard__imageContainer">
          <img
            className="productCard__image"
            alt={i18n.translate('xpack.enterpriseSearch.productCard.productCardImage', {
              defaultMessage: `${name} Dashboard`,
            })}
            src={img}
          />
        </div>
      }
      paddingSize="l"
      description={
        <EuiTextColor color="subdued">
          <p>{description}</p>
        </EuiTextColor>
      }
      footer={
        <EuiButton
          fill
          to={buttonPath}
          shouldNotCreateHref={true}
          data-test-subj={`Launch${formatTestSubj(name)}Button`}
        >
          {i18n.translate('xpack.enterpriseSearch.productCard.productCardButton', {
            defaultMessage: `Launch ${name}`,
          })}
        </EuiButton>
      }
    />
  );
};
