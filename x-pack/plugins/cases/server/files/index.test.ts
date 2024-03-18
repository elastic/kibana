/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FILE_SIZE, MAX_IMAGE_FILE_SIZE } from '../../common/constants';
import { createFilesSetupMock } from '@kbn/files-plugin/server/mocks';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { createMaxCallback, registerCaseFileKinds } from '.';
import { ConfigSchema } from '../config';

describe('server files', () => {
  describe('registerCaseFileKinds', () => {
    const mockFilesSetup = createFilesSetupMock();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('file sizes', () => {
      it('sets the max image file size to 10 mb', () => {
        const schema = ConfigSchema.validate({});

        const maxFileSizeFn = createMaxCallback(schema.files);

        expect(
          maxFileSizeFn({
            mimeType: 'image/png',
          } as unknown as FileJSON)
        ).toEqual(MAX_IMAGE_FILE_SIZE);
      });

      it('sets the max file size to 1 when an image is passed but the configuration was specified', () => {
        const schema = ConfigSchema.validate({
          files: {
            maxSize: 1,
          },
        });

        const maxFileSizeFn = createMaxCallback(schema.files);

        expect(
          maxFileSizeFn({
            mimeType: 'image/png',
          } as unknown as FileJSON)
        ).toEqual(1);
      });

      it('sets the max non-image file size to default 100 mb', () => {
        const schema = ConfigSchema.validate({});

        const maxFileSizeFn = createMaxCallback(schema.files);

        expect(
          maxFileSizeFn({
            mimeType: 'text/plain',
          } as unknown as FileJSON)
        ).toEqual(MAX_FILE_SIZE);
      });

      it('returns 100 mb when images are not allowed in the mime type and an image is passed', () => {
        const schemaNoImages = ConfigSchema.validate({
          files: {
            allowedMimeTypes: ['abc/123'],
          },
        });

        const maxFn = createMaxCallback(schemaNoImages.files);

        expect(
          maxFn({
            mimeType: 'image/png',
          } as unknown as FileJSON)
        ).toEqual(MAX_FILE_SIZE);
      });

      it('returns 100 mb when the mime type is not recognized', () => {
        const schemaNoImages = ConfigSchema.validate({
          files: {
            allowedMimeTypes: ['abc/123'],
          },
        });

        const maxFn = createMaxCallback(schemaNoImages.files);

        expect(
          maxFn({
            mimeType: 'hi/bye',
          } as unknown as FileJSON)
        ).toEqual(MAX_FILE_SIZE);
      });

      it('returns 100 mb when the mime type is undefined', () => {
        const schemaNoImages = ConfigSchema.validate({
          files: {
            allowedMimeTypes: ['abc/123'],
          },
        });

        const maxFn = createMaxCallback(schemaNoImages.files);

        expect(
          maxFn({
            mimeType: undefined,
          } as unknown as FileJSON)
        ).toEqual(MAX_FILE_SIZE);
      });
    });

    describe('allowed mime types', () => {
      describe('image png', () => {
        const schema = ConfigSchema.validate({ files: { allowedMimeTypes: ['image/png'] } });

        it('sets the cases file kind allowed mime types to only image png', () => {
          registerCaseFileKinds(schema.files, mockFilesSetup);

          expect(mockFilesSetup.registerFileKind.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              Object {
                "allowedMimeTypes": Array [
                  "image/png",
                ],
                "hashes": Array [
                  "md5",
                  "sha1",
                  "sha256",
                ],
                "http": Object {
                  "create": Object {
                    "tags": Array [
                      "access:casesFilesCasesCreate",
                    ],
                  },
                  "download": Object {
                    "tags": Array [
                      "access:casesFilesCasesRead",
                    ],
                  },
                  "getById": Object {
                    "tags": Array [
                      "access:casesFilesCasesRead",
                    ],
                  },
                  "list": Object {
                    "tags": Array [
                      "access:casesFilesCasesRead",
                    ],
                  },
                },
                "id": "casesFilesCases",
                "maxSizeBytes": [Function],
              },
            ]
          `);
        });

        it('sets the observability file kind allowed mime types to only image png', () => {
          registerCaseFileKinds(schema.files, mockFilesSetup);

          expect(mockFilesSetup.registerFileKind.mock.calls[1]).toMatchInlineSnapshot(`
            Array [
              Object {
                "allowedMimeTypes": Array [
                  "image/png",
                ],
                "hashes": Array [
                  "md5",
                  "sha1",
                  "sha256",
                ],
                "http": Object {
                  "create": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesCreate",
                    ],
                  },
                  "download": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesRead",
                    ],
                  },
                  "getById": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesRead",
                    ],
                  },
                  "list": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesRead",
                    ],
                  },
                },
                "id": "observabilityFilesCases",
                "maxSizeBytes": [Function],
              },
            ]
          `);
        });

        it('sets the security solution file kind allowed mime types to only image png', () => {
          registerCaseFileKinds(schema.files, mockFilesSetup);

          expect(mockFilesSetup.registerFileKind.mock.calls[2]).toMatchInlineSnapshot(`
            Array [
              Object {
                "allowedMimeTypes": Array [
                  "image/png",
                ],
                "hashes": Array [
                  "md5",
                  "sha1",
                  "sha256",
                ],
                "http": Object {
                  "create": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesCreate",
                    ],
                  },
                  "download": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesRead",
                    ],
                  },
                  "getById": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesRead",
                    ],
                  },
                  "list": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesRead",
                    ],
                  },
                },
                "id": "securitySolutionFilesCases",
                "maxSizeBytes": [Function],
              },
            ]
          `);
        });
      });

      describe('no mime types', () => {
        const schema = ConfigSchema.validate({ files: { allowedMimeTypes: [] } });

        it('sets the cases file kind allowed mime types to an empty array', () => {
          registerCaseFileKinds(schema.files, mockFilesSetup);

          expect(mockFilesSetup.registerFileKind.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              Object {
                "allowedMimeTypes": Array [],
                "hashes": Array [
                  "md5",
                  "sha1",
                  "sha256",
                ],
                "http": Object {
                  "create": Object {
                    "tags": Array [
                      "access:casesFilesCasesCreate",
                    ],
                  },
                  "download": Object {
                    "tags": Array [
                      "access:casesFilesCasesRead",
                    ],
                  },
                  "getById": Object {
                    "tags": Array [
                      "access:casesFilesCasesRead",
                    ],
                  },
                  "list": Object {
                    "tags": Array [
                      "access:casesFilesCasesRead",
                    ],
                  },
                },
                "id": "casesFilesCases",
                "maxSizeBytes": [Function],
              },
            ]
          `);
        });

        it('sets the observability file kind allowed mime types to an empty array', () => {
          registerCaseFileKinds(schema.files, mockFilesSetup);

          expect(mockFilesSetup.registerFileKind.mock.calls[1]).toMatchInlineSnapshot(`
            Array [
              Object {
                "allowedMimeTypes": Array [],
                "hashes": Array [
                  "md5",
                  "sha1",
                  "sha256",
                ],
                "http": Object {
                  "create": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesCreate",
                    ],
                  },
                  "download": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesRead",
                    ],
                  },
                  "getById": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesRead",
                    ],
                  },
                  "list": Object {
                    "tags": Array [
                      "access:observabilityFilesCasesRead",
                    ],
                  },
                },
                "id": "observabilityFilesCases",
                "maxSizeBytes": [Function],
              },
            ]
          `);
        });

        it('sets the security solution file kind allowed mime types to an empty array', () => {
          registerCaseFileKinds(schema.files, mockFilesSetup);

          expect(mockFilesSetup.registerFileKind.mock.calls[2]).toMatchInlineSnapshot(`
            Array [
              Object {
                "allowedMimeTypes": Array [],
                "hashes": Array [
                  "md5",
                  "sha1",
                  "sha256",
                ],
                "http": Object {
                  "create": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesCreate",
                    ],
                  },
                  "download": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesRead",
                    ],
                  },
                  "getById": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesRead",
                    ],
                  },
                  "list": Object {
                    "tags": Array [
                      "access:securitySolutionFilesCasesRead",
                    ],
                  },
                },
                "id": "securitySolutionFilesCases",
                "maxSizeBytes": [Function],
              },
            ]
          `);
        });
      });
    });

    describe('defaults', () => {
      const defaultSchema = ConfigSchema.validate({});

      it('sets the cases file kind with defaults correctly', () => {
        registerCaseFileKinds(defaultSchema.files, mockFilesSetup);

        expect(mockFilesSetup.registerFileKind.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Object {
              "allowedMimeTypes": Array [
                "image/aces",
                "image/apng",
                "image/avci",
                "image/avcs",
                "image/avif",
                "image/bmp",
                "image/cgm",
                "image/dicom-rle",
                "image/dpx",
                "image/emf",
                "image/example",
                "image/fits",
                "image/g3fax",
                "image/heic",
                "image/heic-sequence",
                "image/heif",
                "image/heif-sequence",
                "image/hej2k",
                "image/hsj2",
                "image/jls",
                "image/jp2",
                "image/jpeg",
                "image/jph",
                "image/jphc",
                "image/jpm",
                "image/jpx",
                "image/jxr",
                "image/jxrA",
                "image/jxrS",
                "image/jxs",
                "image/jxsc",
                "image/jxsi",
                "image/jxss",
                "image/ktx",
                "image/ktx2",
                "image/naplps",
                "image/png",
                "image/prs.btif",
                "image/prs.pti",
                "image/pwg-raster",
                "image/svg+xml",
                "image/t38",
                "image/tiff",
                "image/tiff-fx",
                "image/vnd.adobe.photoshop",
                "image/vnd.airzip.accelerator.azv",
                "image/vnd.cns.inf2",
                "image/vnd.dece.graphic",
                "image/vnd.djvu",
                "image/vnd.dwg",
                "image/vnd.dxf",
                "image/vnd.dvb.subtitle",
                "image/vnd.fastbidsheet",
                "image/vnd.fpx",
                "image/vnd.fst",
                "image/vnd.fujixerox.edmics-mmr",
                "image/vnd.fujixerox.edmics-rlc",
                "image/vnd.globalgraphics.pgb",
                "image/vnd.microsoft.icon",
                "image/vnd.mix",
                "image/vnd.ms-modi",
                "image/vnd.mozilla.apng",
                "image/vnd.net-fpx",
                "image/vnd.pco.b16",
                "image/vnd.radiance",
                "image/vnd.sealed.png",
                "image/vnd.sealedmedia.softseal.gif",
                "image/vnd.sealedmedia.softseal.jpg",
                "image/vnd.svf",
                "image/vnd.tencent.tap",
                "image/vnd.valve.source.texture",
                "image/vnd.wap.wbmp",
                "image/vnd.xiff",
                "image/vnd.zbrush.pcx",
                "image/webp",
                "image/wmf",
                "text/plain",
                "text/csv",
                "text/json",
                "application/json",
                "application/zip",
                "application/gzip",
                "application/x-bzip",
                "application/x-bzip2",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/pdf",
              ],
              "hashes": Array [
                "md5",
                "sha1",
                "sha256",
              ],
              "http": Object {
                "create": Object {
                  "tags": Array [
                    "access:casesFilesCasesCreate",
                  ],
                },
                "download": Object {
                  "tags": Array [
                    "access:casesFilesCasesRead",
                  ],
                },
                "getById": Object {
                  "tags": Array [
                    "access:casesFilesCasesRead",
                  ],
                },
                "list": Object {
                  "tags": Array [
                    "access:casesFilesCasesRead",
                  ],
                },
              },
              "id": "casesFilesCases",
              "maxSizeBytes": [Function],
            },
          ]
        `);
      });

      it('sets the observability file kind with defaults correctly', () => {
        registerCaseFileKinds(defaultSchema.files, mockFilesSetup);

        expect(mockFilesSetup.registerFileKind.mock.calls[1]).toMatchInlineSnapshot(`
          Array [
            Object {
              "allowedMimeTypes": Array [
                "image/aces",
                "image/apng",
                "image/avci",
                "image/avcs",
                "image/avif",
                "image/bmp",
                "image/cgm",
                "image/dicom-rle",
                "image/dpx",
                "image/emf",
                "image/example",
                "image/fits",
                "image/g3fax",
                "image/heic",
                "image/heic-sequence",
                "image/heif",
                "image/heif-sequence",
                "image/hej2k",
                "image/hsj2",
                "image/jls",
                "image/jp2",
                "image/jpeg",
                "image/jph",
                "image/jphc",
                "image/jpm",
                "image/jpx",
                "image/jxr",
                "image/jxrA",
                "image/jxrS",
                "image/jxs",
                "image/jxsc",
                "image/jxsi",
                "image/jxss",
                "image/ktx",
                "image/ktx2",
                "image/naplps",
                "image/png",
                "image/prs.btif",
                "image/prs.pti",
                "image/pwg-raster",
                "image/svg+xml",
                "image/t38",
                "image/tiff",
                "image/tiff-fx",
                "image/vnd.adobe.photoshop",
                "image/vnd.airzip.accelerator.azv",
                "image/vnd.cns.inf2",
                "image/vnd.dece.graphic",
                "image/vnd.djvu",
                "image/vnd.dwg",
                "image/vnd.dxf",
                "image/vnd.dvb.subtitle",
                "image/vnd.fastbidsheet",
                "image/vnd.fpx",
                "image/vnd.fst",
                "image/vnd.fujixerox.edmics-mmr",
                "image/vnd.fujixerox.edmics-rlc",
                "image/vnd.globalgraphics.pgb",
                "image/vnd.microsoft.icon",
                "image/vnd.mix",
                "image/vnd.ms-modi",
                "image/vnd.mozilla.apng",
                "image/vnd.net-fpx",
                "image/vnd.pco.b16",
                "image/vnd.radiance",
                "image/vnd.sealed.png",
                "image/vnd.sealedmedia.softseal.gif",
                "image/vnd.sealedmedia.softseal.jpg",
                "image/vnd.svf",
                "image/vnd.tencent.tap",
                "image/vnd.valve.source.texture",
                "image/vnd.wap.wbmp",
                "image/vnd.xiff",
                "image/vnd.zbrush.pcx",
                "image/webp",
                "image/wmf",
                "text/plain",
                "text/csv",
                "text/json",
                "application/json",
                "application/zip",
                "application/gzip",
                "application/x-bzip",
                "application/x-bzip2",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/pdf",
              ],
              "hashes": Array [
                "md5",
                "sha1",
                "sha256",
              ],
              "http": Object {
                "create": Object {
                  "tags": Array [
                    "access:observabilityFilesCasesCreate",
                  ],
                },
                "download": Object {
                  "tags": Array [
                    "access:observabilityFilesCasesRead",
                  ],
                },
                "getById": Object {
                  "tags": Array [
                    "access:observabilityFilesCasesRead",
                  ],
                },
                "list": Object {
                  "tags": Array [
                    "access:observabilityFilesCasesRead",
                  ],
                },
              },
              "id": "observabilityFilesCases",
              "maxSizeBytes": [Function],
            },
          ]
        `);
      });

      it('sets the securitySolution file kind with defaults correctly', () => {
        registerCaseFileKinds(defaultSchema.files, mockFilesSetup);

        expect(mockFilesSetup.registerFileKind.mock.calls[2]).toMatchInlineSnapshot(`
          Array [
            Object {
              "allowedMimeTypes": Array [
                "image/aces",
                "image/apng",
                "image/avci",
                "image/avcs",
                "image/avif",
                "image/bmp",
                "image/cgm",
                "image/dicom-rle",
                "image/dpx",
                "image/emf",
                "image/example",
                "image/fits",
                "image/g3fax",
                "image/heic",
                "image/heic-sequence",
                "image/heif",
                "image/heif-sequence",
                "image/hej2k",
                "image/hsj2",
                "image/jls",
                "image/jp2",
                "image/jpeg",
                "image/jph",
                "image/jphc",
                "image/jpm",
                "image/jpx",
                "image/jxr",
                "image/jxrA",
                "image/jxrS",
                "image/jxs",
                "image/jxsc",
                "image/jxsi",
                "image/jxss",
                "image/ktx",
                "image/ktx2",
                "image/naplps",
                "image/png",
                "image/prs.btif",
                "image/prs.pti",
                "image/pwg-raster",
                "image/svg+xml",
                "image/t38",
                "image/tiff",
                "image/tiff-fx",
                "image/vnd.adobe.photoshop",
                "image/vnd.airzip.accelerator.azv",
                "image/vnd.cns.inf2",
                "image/vnd.dece.graphic",
                "image/vnd.djvu",
                "image/vnd.dwg",
                "image/vnd.dxf",
                "image/vnd.dvb.subtitle",
                "image/vnd.fastbidsheet",
                "image/vnd.fpx",
                "image/vnd.fst",
                "image/vnd.fujixerox.edmics-mmr",
                "image/vnd.fujixerox.edmics-rlc",
                "image/vnd.globalgraphics.pgb",
                "image/vnd.microsoft.icon",
                "image/vnd.mix",
                "image/vnd.ms-modi",
                "image/vnd.mozilla.apng",
                "image/vnd.net-fpx",
                "image/vnd.pco.b16",
                "image/vnd.radiance",
                "image/vnd.sealed.png",
                "image/vnd.sealedmedia.softseal.gif",
                "image/vnd.sealedmedia.softseal.jpg",
                "image/vnd.svf",
                "image/vnd.tencent.tap",
                "image/vnd.valve.source.texture",
                "image/vnd.wap.wbmp",
                "image/vnd.xiff",
                "image/vnd.zbrush.pcx",
                "image/webp",
                "image/wmf",
                "text/plain",
                "text/csv",
                "text/json",
                "application/json",
                "application/zip",
                "application/gzip",
                "application/x-bzip",
                "application/x-bzip2",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/pdf",
              ],
              "hashes": Array [
                "md5",
                "sha1",
                "sha256",
              ],
              "http": Object {
                "create": Object {
                  "tags": Array [
                    "access:securitySolutionFilesCasesCreate",
                  ],
                },
                "download": Object {
                  "tags": Array [
                    "access:securitySolutionFilesCasesRead",
                  ],
                },
                "getById": Object {
                  "tags": Array [
                    "access:securitySolutionFilesCasesRead",
                  ],
                },
                "list": Object {
                  "tags": Array [
                    "access:securitySolutionFilesCasesRead",
                  ],
                },
              },
              "id": "securitySolutionFilesCases",
              "maxSizeBytes": [Function],
            },
          ]
        `);
      });
    });
  });
});
