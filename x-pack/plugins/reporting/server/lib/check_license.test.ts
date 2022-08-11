/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkLicense } from './check_license';
import { ILicense } from '@kbn/licensing-plugin/server';
import { ExportTypesRegistry } from './export_types_registry';

describe('check_license', () => {
  let exportTypesRegistry: ExportTypesRegistry;
  let license: ILicense;

  beforeEach(() => {
    exportTypesRegistry = {
      getAll: () => [],
    } as unknown as ExportTypesRegistry;
  });

  describe('license information is not ready', () => {
    beforeEach(() => {
      exportTypesRegistry = {
        getAll: () => [{ id: 'csv_searchsource' }],
      } as unknown as ExportTypesRegistry;
    });

    it('should set management.showLinks to true', () => {
      expect(checkLicense(exportTypesRegistry, undefined).management.showLinks).toEqual(true);
    });

    it('should set csv_searchsource.showLinks to true', () => {
      expect(checkLicense(exportTypesRegistry, undefined).csv_searchsource.showLinks).toEqual(true);
    });

    it('should set management.enableLinks to false', () => {
      expect(checkLicense(exportTypesRegistry, undefined).management.enableLinks).toEqual(false);
    });

    it('should set csv_searchsource.enableLinks to false', () => {
      expect(checkLicense(exportTypesRegistry, undefined).csv_searchsource.enableLinks).toEqual(
        false
      );
    });

    it('should set management.jobTypes to undefined', () => {
      expect(checkLicense(exportTypesRegistry, undefined).management.jobTypes).toEqual(undefined);
    });
  });

  describe('license information is not available', () => {
    beforeEach(() => {
      license = {
        type: undefined,
      } as ILicense;
      exportTypesRegistry = {
        getAll: () => [{ id: 'csv_searchsource' }],
      } as unknown as ExportTypesRegistry;
    });

    it('should set management.showLinks to true', () => {
      expect(checkLicense(exportTypesRegistry, license).management.showLinks).toEqual(true);
    });

    it('should set csv_searchsource.showLinks to true', () => {
      expect(checkLicense(exportTypesRegistry, license).csv_searchsource.showLinks).toEqual(true);
    });

    it('should set management.enableLinks to false', () => {
      expect(checkLicense(exportTypesRegistry, license).management.enableLinks).toEqual(false);
    });

    it('should set csv_searchsource.enableLinks to false', () => {
      expect(checkLicense(exportTypesRegistry, license).csv_searchsource.enableLinks).toEqual(
        false
      );
    });

    it('should set management.jobTypes to undefined', () => {
      expect(checkLicense(exportTypesRegistry, license).management.jobTypes).toEqual(undefined);
    });
  });

  describe('license information is available', () => {
    beforeEach(() => {
      license = {} as ILicense;
    });

    describe('& license is > basic', () => {
      beforeEach(() => {
        license.type = 'gold';
        exportTypesRegistry = {
          getAll: () => [{ id: 'pdf', validLicenses: ['gold'], jobType: 'printable_pdf' }],
        } as unknown as ExportTypesRegistry;
      });

      describe('& license is active', () => {
        beforeEach(() => (license.isActive = true));

        it('should set management.showLinks to true', () => {
          expect(checkLicense(exportTypesRegistry, license).management.showLinks).toEqual(true);
        });

        it('should setpdf.showLinks to true', () => {
          expect(checkLicense(exportTypesRegistry, license).pdf.showLinks).toEqual(true);
        });

        it('should set management.enableLinks to true', () => {
          expect(checkLicense(exportTypesRegistry, license).management.enableLinks).toEqual(true);
        });

        it('should setpdf.enableLinks to true', () => {
          expect(checkLicense(exportTypesRegistry, license).pdf.enableLinks).toEqual(true);
        });

        it('should set management.jobTypes to contain testJobType', () => {
          expect(checkLicense(exportTypesRegistry, license).management.jobTypes).toContain(
            'printable_pdf'
          );
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => {
          license.isActive = false;
        });

        it('should set management.showLinks to true', () => {
          expect(checkLicense(exportTypesRegistry, license).management.showLinks).toEqual(true);
        });

        it('should set pdf.showLinks to true', () => {
          expect(checkLicense(exportTypesRegistry, license).pdf.showLinks).toEqual(true);
        });

        it('should set management.enableLinks to false', () => {
          expect(checkLicense(exportTypesRegistry, license).management.enableLinks).toEqual(false);
        });

        it('should set pdf.enableLinks to false', () => {
          expect(checkLicense(exportTypesRegistry, license).pdf.enableLinks).toEqual(false);
        });

        it('should set management.jobTypes to undefined', () => {
          expect(checkLicense(exportTypesRegistry, license).management.jobTypes).toEqual(undefined);
        });
      });
    });

    describe('& license is basic', () => {
      beforeEach(() => {
        license.type = 'basic';
        exportTypesRegistry = {
          getAll: () => [{ id: 'pdf', validLicenses: ['gold'], jobType: 'printable_pdf' }],
        } as unknown as ExportTypesRegistry;
      });

      describe('& license is active', () => {
        beforeEach(() => {
          license.isActive = true;
        });

        it('should set management.showLinks to false', () => {
          expect(checkLicense(exportTypesRegistry, license).management.showLinks).toEqual(false);
        });

        it('should set test.showLinks to false', () => {
          expect(checkLicense(exportTypesRegistry, license).pdf.showLinks).toEqual(false);
        });

        it('should set management.jobTypes to an empty array', () => {
          expect(checkLicense(exportTypesRegistry, license).management.jobTypes).toEqual([]);
          expect(checkLicense(exportTypesRegistry, license).management.jobTypes).toHaveLength(0);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => {
          license.isActive = false;
        });

        it('should set management.showLinks to true', () => {
          expect(checkLicense(exportTypesRegistry, license).management.showLinks).toEqual(true);
        });

        it('should set test.showLinks to false', () => {
          expect(checkLicense(exportTypesRegistry, license).pdf.showLinks).toEqual(false);
        });

        it('should set management.jobTypes to undefined', () => {
          expect(checkLicense(exportTypesRegistry, license).management.jobTypes).toEqual(undefined);
        });
      });
    });
  });
});
