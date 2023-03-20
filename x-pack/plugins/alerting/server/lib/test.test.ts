import { getRuleSnoozeEndTime } from './is_rule_snoozed';
import { utcToLocal } from './snooze/is_snooze_active';
import moment from 'moment';

describe('repro', () => {
  // To reproduce, first we must set the timezone to the customer's timezone, 
  // In alerting/jest.config.js, before module.exports, we can set the timezone:
  // 
  // process.env.TZ = 'CET';

  it('start', () => {
    // Set the current time as: 
    //   - Feb 27 2023 08:15:00 GMT+0000
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-02-27T08:15:00.000Z'));

    // console.log(date.getHours());
    // console.log(utcToLocal(date).getHours());


    // console.log(utcToLocal(date).toT());
    
    // return;

    // Try to get snooze end time with:
    //   - Start date of: Feb 24 2023 23:00:00 GMT+0000
    //   - End date of: Feb 27 2023 06:00:00 GMT+0000
    //     - Which is obtained from start date + 2 days and 7 hours (198000000 ms) 
    const result = getRuleSnoozeEndTime({
      muteAll: false,
      snoozeSchedule: [
        {
          "duration": 198000000,
          "rRule": {
            "byweekday": [
              "SA"
            ],
            "tzid": "Europe/Madrid",
            "freq": 2,
            "interval": 1,
            "dtstart": "2023-02-24T23:00:00.000Z"
          },
          "id": "9141dc1f-ed85-4656-91e4-119173105432"
        }
      ]
    });
    
    // In theory, the snooze should be over now, this should pass but it does not.
    // expect(result).toEqual(null);

    // Instead we get: 
    //
    // expect(received).toEqual(expected) // deep equality
    // Expected: null
    // Received: 2023-02-28T05:00:00.000Z
    //

    // If we try to log what we see on the front end snooze tooltip, we get the 
    // same bug that the customer noticed (snooze for a day)
    //
    // console.log(moment(result).fromNow(true));
  });
});
