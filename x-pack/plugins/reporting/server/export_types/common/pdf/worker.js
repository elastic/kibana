/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-var-requires*/
const { i18n } = require('@kbn/i18n');
const { workerData, parentPort, isMainThread } = require('worker_threads');
const _ = require('lodash');
const path = require('path');
const PdfMake = require('pdfmake');
// @ts-ignore: no module definition
const concat = require('concat-stream');

function getFont(text) {
  // We are matching Han characters which is one of the supported unicode scripts
  // (you can see the full list of supported scripts here: http://www.unicode.org/standard/supported.html).
  // This will match Chinese, Japanese, Korean and some other Asian languages.
  const isCKJ = /\p{Script=Han}/gu.test(text);
  if (isCKJ) {
    return 'noto-cjk';
  } else {
    return 'Roboto';
  }
}

function getTemplate(layout, logo, title, tableBorderWidth, assetPath) {
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

  const getStyle = () => ({
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
  const getHeader = () => ({
    margin: [pageMarginWidth, pageMarginTop / 4, pageMarginWidth, 0],
    text: title,
    font: getFont(title),
    style: {
      color: '#aaa',
    },
    fontSize: 10,
    alignment: 'center',
  });
  const getFooter = () => (currentPage, pageCount) => {
    const logoPath = path.resolve(assetPath, 'img', 'logo-grey.png'); // Default Elastic Logo
    return {
      margin: [pageMarginWidth, pageMarginBottom / 4, pageMarginWidth, 0],
      layout: 'noBorder',
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
    pageOrientation: layout.orientation,
    pageSize: layout.pageSize,
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

console.log('current dir', __dirname);

// const { getTemplate } = require('./get_template_copy');

if (!isMainThread) {
  const assetPath = path.resolve(__dirname, '..', '..', 'common', 'assets');
  const tableBorderWidth = 1;

  const fontPath = (filename) => path.resolve(assetPath, 'fonts', filename);

  const fonts = {
    Roboto: {
      normal: fontPath('roboto/Roboto-Regular.ttf'),
      bold: fontPath('roboto/Roboto-Medium.ttf'),
      italics: fontPath('roboto/Roboto-Italic.ttf'),
      bolditalics: fontPath('roboto/Roboto-Italic.ttf'),
    },
    'noto-cjk': {
      // Roboto does not support CJK characters, so we'll fall back on this font if we detect them.
      normal: fontPath('noto/NotoSansCJKtc-Regular.ttf'),
      bold: fontPath('noto/NotoSansCJKtc-Medium.ttf'),
      italics: fontPath('noto/NotoSansCJKtc-Regular.ttf'),
      bolditalics: fontPath('noto/NotoSansCJKtc-Medium.ttf'),
    },
  };

  const printer = new PdfMake(fonts);

  const { layout, logo, title, content } = workerData;

  (async function execute() {
    const docDefinition = _.assign(getTemplate(layout, logo, title, tableBorderWidth, assetPath), {
      content,
    });

    const pdfDoc = printer.createPdfKitDocument(docDefinition, {
      tableLayouts: {
        noBorder: {
          // format is function (i, node) { ... };
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    });

    const buffer = await new Promise((resolve, reject) => {
      if (!pdfDoc) {
        throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.printablePdf.documentStreamIsNotgeneratedErrorMessage',
            {
              defaultMessage: 'Document stream has not been generated',
            }
          )
        );
      }

      const concatStream = concat(function (pdfBuffer) {
        resolve(pdfBuffer);
      });

      pdfDoc.on('error', reject);
      pdfDoc.pipe(concatStream);
      pdfDoc.end();
    });

    parentPort.postMessage(buffer);
  })();
}
