import { Moment } from "moment";

export const createNginxTimestamp = (time: Moment) => time.format('DD/MMM/YYYY HH:mm:ss ZZ');

