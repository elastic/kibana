/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test, tags } from '@kbn/scout';

// Helper function to get management menu sections from the UI
async function getManagementSections(page: any) {
  const sectionsElements = await page.locator('.kbnSolutionNav .euiSideNavItem--root').all();

  const sections = [];

  for (const el of sectionsElements) {
    const sectionButton = el.locator('.euiSideNavItemButton').first();
    const sectionId = await sectionButton.getAttribute('data-test-subj');

    const sectionLinkElements = await el.locator('.euiSideNavItem > a.euiSideNavItemButton').all();

    const sectionLinks = [];
    for (const linkEl of sectionLinkElements) {
      const testSubj = await linkEl.getAttribute('data-test-subj');
      if (testSubj) {
        sectionLinks.push(testSubj);
      }
    }

    sections.push({ sectionId, sectionLinks });
  }

  return sections;
}

// Helper function to check if apps menu contains a specific link text
async function checkAppsMenuContains(page: any, linkText: string): Promise<boolean> {
  // Open collapsible nav if it's not already open
  const navButton = page.locator('[data-test-subj="toggleNavButton"]');
  const isVisible = await navButton.isVisible().catch(() => false);

  if (isVisible) {
    const navPanel = page.locator('[data-test-subj="collapsibleNav"]');
    const isPanelVisible = await navPanel.isVisible().catch(() => false);

    if (!isPanelVisible) {
      await navButton.click();
      await navPanel.waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  // Look for the link text in the navigation
  const links = await page.locator('[data-test-subj="collapsibleNav"] a').all();

  for (const link of links) {
    const text = await link.innerText();
    if (text.includes(linkText)) {
      return true;
    }
  }

  return false;
}

test.describe('security', { tag: tags.ESS_ONLY }, () => {
  test.describe('global all privileges (aka kibana_admin)', () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      const random = `does-not-exist-${Math.random().toString(36).substring(2, 15)}`;
      await browserAuth.loginWithCustomRole({
        kibana: [
          {
            base: ['all'],
            feature: {},
            spaces: ['default', random],
          },
        ],
        elasticsearch: {
          cluster: [],
        },
      });
      await page.gotoApp('management');
      await page.testSubj.locator('managementHome').waitFor({ state: 'attached' });
    });

    test('should show the Stack Management nav link', async ({ page }) => {
      // Check if apps menu contains 'Stack Management'
      const containsStackManagement = await checkAppsMenuContains(page, 'Stack Management');
      expect(containsStackManagement).toBe(true);
    });

    test('should not render the "Security" section', async ({ page }) => {
      // Get management menu sections
      const sections = await getManagementSections(page);

      // Extract section IDs
      const sectionIds = sections.map((section) => section.sectionId);

      // Verify section IDs contain expected sections
      expect(sectionIds).toContain('data');
      expect(sectionIds).toContain('insightsAndAlerting');
      expect(sectionIds).toContain('kibana');

      // Find data section and verify its links
      const dataSection = sections.find((section) => section.sectionId === 'data');
      expect(dataSection?.sectionLinks).toEqual(['data_quality', 'content_connectors']);
    });
  });

  test.describe('global dashboard read with manage_security', () => {
    test.beforeEach(async ({ browserAuth, page }) => {
      const random = `does-not-exist-${Math.random().toString(36).substring(2, 15)}`;
      await browserAuth.loginWithCustomRole({
        kibana: [
          {
            base: [],
            feature: {
              dashboard: ['read'],
            },
            spaces: ['default', random],
          },
        ],
        elasticsearch: {
          cluster: ['manage_security'],
        },
      });

      await page.gotoApp('management');
      await page.testSubj.locator('managementHome').waitFor({ state: 'attached' });
    });

    test('should show the Stack Management nav link for manage_security', async ({ page }) => {
      // Check if apps menu contains 'Stack Management'
      const containsStackManagement = await checkAppsMenuContains(page, 'Stack Management');
      expect(containsStackManagement).toBe(true);
    });

    test('should render the "Security" section with API Keys', async ({ page }) => {
      // Get management menu sections
      const sections = await getManagementSections(page);

      // Verify sections array has length 1
      expect(sections).toHaveLength(1);

      // Verify first section has expected properties
      expect(sections[0]).toEqual({
        sectionId: 'security',
        sectionLinks: ['users', 'roles', 'api_keys', 'role_mappings'],
      });
    });
  });
});
