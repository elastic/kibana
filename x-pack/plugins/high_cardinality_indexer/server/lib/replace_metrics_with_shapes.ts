import { Moment } from "moment";
import { Doc, ParsedSchedule } from "../types";
import { has, set, isNumber } from 'lodash';
import { createDataShapeFunction } from "./data_shapes";

export const replaceMetricsWithShapes = (timestamp: Moment, schedule: ParsedSchedule, docs: Doc[]): Doc[] => {
  const { metrics } = schedule;
  if (metrics != null && metrics.length) {
    return docs.map((doc) => {
      for(const metric of metrics) {
        if (has(doc, metric.name)) {
          const startPoint = { x: schedule.start, y: metric.start };
          const endPoint = { x: isNumber(schedule.end) ? schedule.end : Date.now(), y: metric.end };
          const fn = createDataShapeFunction(metric.method, startPoint, endPoint, metric.randomness ?? 0, metric.period ?? 1000);
          set(doc, metric.name, fn(timestamp));
        }
      }
      return doc;
    });
  }
  return docs;
};

