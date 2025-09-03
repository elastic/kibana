/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rgb, nest } from 'd3';

import { FtrProviderContext } from '../ftr_provider_context';

interface ColorStat {
  color: string;
  percentage: number;
  pixels?: number;
  withinTolerance?: boolean;
}

export type CanvasElementColorStats = ColorStat[];

function getRoundedChannel(value: number, tolerance: number): number {
  return Math.round(value / tolerance) * tolerance;
}

export async function CanvasElementProvider({ getService }: FtrProviderContext) {
  const { driver } = await getService('__webdriver__').init();

  return new (class CanvasElementService {
    // disable font anti-aliasing to be more resilient
    // against OS rendering differences
    public async disableAntiAliasing() {
      await driver.executeScript(
        `
        document.body.style["font-smooth"] = "never";
        document.body.style["-webkit-font-smoothing"] = "none";
        document.body.classList.add("mlDisableAntiAliasing");
        `
      );
    }

    public async resetAntiAliasing() {
      await driver.executeScript(
        `
        document.body.style["font-smooth"] = "";
        document.body.style["-webkit-font-smoothing"] = "";
        document.body.classList.remove("mlDisableAntiAliasing");
        `
      );
    }

    /**
     * Gets the image data of a canvas element
     * @param selector querySelector to access the canvas element.
     *
     * @returns {Promise<number[]>} a single level array of number where every 4 numbers represent a RGBA value.
     */
    public async getImageData(selector: string): Promise<number[]> {
      return await driver.executeScript(
        `
        try {
          const el = document.querySelector('${selector}');
          const ctx = el.getContext('2d');
          return ctx.getImageData(0, 0, el.width, el.height).data;
        } catch(e) {
          return [];
        }
        `
      );
    }

    /**
     * Returns color statistics for image data derived from a 2D Canvas element.
     *
     * @param selector querySelector to access the canvas element.
     * @param expectedColorStats - optional stats to compare against and check if the percentage is within the tolerance.
     * @param percentageThreshold - colors below this percentage threshold will be filtered from the returned list of colors
     * @param channelTolerance - tolerance for each RGB channel value
     * @param exclude - colors to exclude, useful for e.g. known background color values
     * @returns an array of colors and their percentage of appearance in the given image data
     */
    public async getColorStats(
      selector: string,
      expectedColorStats?: CanvasElementColorStats,
      exclude?: string[],
      percentageThreshold = 5,
      channelTolerance = 10,
      valueTolerance = 10
    ): Promise<CanvasElementColorStats> {
      const imageData = await this.getImageData(selector);
      // transform the array of RGBA numbers to an array of hex values
      const colors: string[] = [];
      for (let i = 0; i < imageData.length; i += 4) {
        // uses d3's `rgb` method create a color object, `toString()` returns the hex value
        const r = getRoundedChannel(imageData[i], channelTolerance);
        const g = getRoundedChannel(imageData[i + 1], channelTolerance);
        const b = getRoundedChannel(imageData[i + 2], channelTolerance);
        const color = rgb(r, g, b).toString().toUpperCase();
        if (exclude === undefined || !exclude.includes(color)) colors.push(color);
      }

      function getPixelPercentage(pixelsNum: number): number {
        return (pixelsNum / colors.length) * 100;
      }

      // - d3's nest/key/entries methods will group the array of hex values so we can count
      //   the number of times a color appears in the image.
      // - then we'll filter all colors below the given threshold
      // - last step is to return the ColorStat object which includes the color,
      //   the percentage it shows up in the image and optionally the check if it's within
      //   the tolerance of the expected value.
      return nest<string>()
        .key((d) => d)
        .entries(colors)
        .filter((s) => getPixelPercentage(s.values.length) >= percentageThreshold)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((s, i) => {
          const percentage = getPixelPercentage(s.values.length);
          const pixels = s.values.length;
          return {
            color: s.key,
            percentage,
            pixels,
            ...(expectedColorStats !== undefined
              ? {
                  withinTolerance:
                    this.isValueWithinTolerance(
                      percentage,
                      pixels,
                      expectedColorStats[i]?.percentage,
                      valueTolerance
                    ) &&
                    this.isColorWithinTolerance(
                      s.key,
                      expectedColorStats[i]?.color,
                      channelTolerance
                    ),
                }
              : {}),
          };
        });
    }

    /**
     * Same as getColorStats() but also checks if each supplied
     * expected color lies within channelTolerance.
     */
    public async getColorStatsWithColorTolerance(
      selector: string,
      expectedColorStats: CanvasElementColorStats,
      exclude?: string[],
      percentageThreshold = 0,
      channelTolerance = 10,
      valueTolerance = 10
    ): Promise<CanvasElementColorStats> {
      const actualColorStats = await this.getColorStats(
        selector,
        undefined,
        exclude,
        percentageThreshold,
        channelTolerance,
        valueTolerance
      );

      return expectedColorStats.map((expectedColor) => {
        const colorsWithinTolerance = actualColorStats.filter((d) =>
          this.isColorWithinTolerance(d.color, expectedColor.color, channelTolerance)
        );
        const colorPercentageWithinTolerance = colorsWithinTolerance.reduce(
          (sum, x) => sum + x.percentage,
          0
        );
        const pixelsWithinTolerance = colorsWithinTolerance.reduce(
          (sum, x) => sum + (x.pixels || 0),
          0
        );

        return {
          color: expectedColor.color,
          percentage: colorPercentageWithinTolerance,
          pixels: pixelsWithinTolerance,
          withinTolerance: this.isValueWithinTolerance(
            colorPercentageWithinTolerance,
            pixelsWithinTolerance,
            expectedColor.percentage,
            valueTolerance
          ),
        };
      });
    }

    /**
     * Returns if a given color is within the tolerated range of an expected color
     *
     * @param actualColor
     * @param expectedColor
     * @param toleranceRange
     * @returns if actualColor is within the tolerance of expectedColor
     */
    public isColorWithinTolerance(actualColor: string, expectedColor: string, toleranceRange = 10) {
      const actualRGB = rgb(actualColor);
      const expectedRGB = rgb(expectedColor);

      return (
        getRoundedChannel(expectedRGB.r, toleranceRange) ===
          getRoundedChannel(actualRGB.r, toleranceRange) &&
        getRoundedChannel(expectedRGB.g, toleranceRange) ===
          getRoundedChannel(actualRGB.g, toleranceRange) &&
        getRoundedChannel(expectedRGB.b, toleranceRange) ===
          getRoundedChannel(actualRGB.b, toleranceRange)
      );
    }

    /**
     * Returns if a given value is within the tolerated range of an expected value
     *
     * @param actualPercentage
     * @param actualPixels
     * @param expectedPercentage
     * @param toleranceRange
     * @returns if actualValue is within the tolerance of expectedValue
     */
    public isValueWithinTolerance(
      actualPercentage: number,
      actualPixels: number,
      expectedPercentage: number,
      toleranceRange = 10
    ) {
      const lower = expectedPercentage - toleranceRange / 2;
      const upper = expectedPercentage + toleranceRange / 2;
      return (
        // actualPercentage could be rounded to 0 so we check against actualPixels if they are above 0.
        actualPixels > 0 && lower <= actualPercentage && upper >= actualPercentage
      );
    }
  })();
}
