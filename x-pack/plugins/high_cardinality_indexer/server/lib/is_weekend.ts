import { Moment } from "moment";

const FRIDAY = 5;
const SUNDAY = 0;
const MONDAY = 1;
const SATURDAY = 6;

export function isWeekendTraffic(timestamp: Moment) {
  const currentDay = timestamp.day();
  const currentHour = timestamp.hour();
  // If it's a weekend day
  if ([SATURDAY, SUNDAY].includes(currentDay)) {
    return true;
  }
  // If it's after 5 pm on Friday
  if (currentDay === FRIDAY && currentHour >= 17) {
    return true;
  }
  // If it's before 6am on Monday
  if (currentDay === MONDAY && currentHour < 6) {
    return true;
  }
  return false;
}

