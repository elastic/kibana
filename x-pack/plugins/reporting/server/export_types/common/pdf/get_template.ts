/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import path from 'path';
import {
  ContentText,
  DynamicContent,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { LayoutInstance } from '../../../lib/layouts';
import { REPORTING_TABLE_LAYOUT } from './get_doc_options';
import { getFont } from './get_font';

export function getTemplate(
  layout: LayoutInstance,
  logo: string | undefined,
  title: string,
  tableBorderWidth: number,
  assetPath: string
): Partial<TDocumentDefinitions> {
  const pageMarginTop = 40;
  const pageMarginBottom = 80;
  const pageMarginWidth = 40;
  const headingFontSize = 14;
  const headingMarginTop = 10;
  const headingMarginBottom = 5;
  const headingHeight = headingFontSize * 1.5 + headingMarginTop + headingMarginBottom;
  const subheadingFontSize = 12;
  const subheadingMarginTop = 0;
  const subheadingMarginBottom = 5;
  const subheadingHeight = subheadingFontSize * 1.5 + subheadingMarginTop + subheadingMarginBottom;

  const getStyle = (): StyleDictionary => ({
    heading: {
      alignment: 'left',
      fontSize: headingFontSize,
      bold: true,
      margin: [headingMarginTop, 0, headingMarginBottom, 0],
    },
    subheading: {
      alignment: 'left',
      fontSize: subheadingFontSize,
      italics: true,
      margin: [0, 0, subheadingMarginBottom, 20],
    },
    warning: {
      color: '#f39c12', // same as @brand-warning in Kibana colors.less
    },
  });
  const getHeader = (): ContentText => ({
    margin: [pageMarginWidth, pageMarginTop / 4, pageMarginWidth, 0],
    text: title,
    font: getFont(title),
    style: {
      color: '#aaa',
    },
    fontSize: 10,
    alignment: 'center',
  });
  const getFooter = (): DynamicContent => (currentPage: number, pageCount: number) => {
    const logoPath = path.resolve(assetPath, 'img', 'logo-grey.png'); // Default Elastic Logo
    return {
      margin: [pageMarginWidth, pageMarginBottom / 4, pageMarginWidth, 0],
      layout: REPORTING_TABLE_LAYOUT,
      table: {
        widths: [100, '*', 100],
        body: [
          [
            {
              fit: [100, 35],
              image: logo || logoPath,
            },
            {
              alignment: 'center',
              text: i18n.translate('xpack.reporting.exportTypes.printablePdf.pagingDescription', {
                defaultMessage: 'Page {currentPage} of {pageCount}',
                values: { currentPage: currentPage.toString(), pageCount },
              }),
              style: {
                color: '#aaa',
              },
            },
            '',
          ],
          [
            logo
              ? {
                  text: i18n.translate('xpack.reporting.exportTypes.printablePdf.logoDescription', {
                    defaultMessage: 'Powered by Elastic',
                  }),
                  fontSize: 10,
                  style: {
                    color: '#aaa',
                  },
                  margin: [0, 2, 0, 0],
                }
              : '',
            '',
            '',
          ],
        ],
      },
    };
  };

  return {
    // define page size
    pageOrientation: layout.getPdfPageOrientation(),
    pageSize: layout.getPdfPageSize({
      pageMarginTop,
      pageMarginBottom,
      pageMarginWidth,
      tableBorderWidth,
      headingHeight,
      subheadingHeight,
    }),
    pageMargins: layout.useReportingBranding
      ? [pageMarginWidth, pageMarginTop, pageMarginWidth, pageMarginBottom]
      : [0, 0, 0, 0],

    header: layout.hasHeader ? getHeader() : undefined,
    footer: layout.hasFooter ? getFooter() : undefined,

    styles: layout.useReportingBranding ? getStyle() : undefined,

    defaultStyle: {
      fontSize: 12,
      font: 'Roboto',
    },
  };
}
